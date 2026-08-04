import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { validarCpf, type AuthResponse, type MeResponse } from '@sindprf/types';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import type { JwtPayload } from '../common/request-user';
import { PrismaService } from '../prisma/prisma.service';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos
const BCRYPT_ROUNDS = 10;

function sha256(valor: string): string {
  return createHash('sha256').update(valor).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(login: string, senha: string): Promise<AuthResponse> {
    const user = await this.encontrarUsuarioPorLogin(login);
    const senhaConfere = user && (await bcrypt.compare(senha, user.senhaHash));
    if (!user || !senhaConfere) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.gerarSessao(user);
  }

  /** CPF (afiliado) ou e-mail (admin / legado). Aceita CPF com ou sem . e -. */
  private async encontrarUsuarioPorLogin(login: string): Promise<User | null> {
    const bruto = login.trim();
    const cpf = bruto.replace(/\D/g, '');

    if (cpf.length === 11 && validarCpf(cpf)) {
      const afiliado = await this.prisma.afiliado.findUnique({
        where: { cpf },
        include: { user: true },
      });
      return afiliado?.user ?? null;
    }

    return this.prisma.user.findUnique({
      where: { email: bruto.toLowerCase() },
    });
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const tokenSalvo = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });

    const valido = tokenSalvo && !tokenSalvo.revogado && tokenSalvo.expiraEm > new Date();
    if (!tokenSalvo || !valido) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    // Rotação: o token usado é revogado e um novo é emitido.
    await this.prisma.refreshToken.update({
      where: { id: tokenSalvo.id },
      data: { revogado: true },
    });
    return this.gerarSessao(tokenSalvo.user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken) },
      data: { revogado: true },
    });
  }

  async me(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { afiliado: true },
    });
    return {
      user: this.toUserDto(user),
      afiliado: user.afiliado,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Resposta idêntica para email inexistente — não revelar quem está cadastrado.
      return;
    }

    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiraEm: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    // Sem serviço de email ainda: o token é logado para uso em desenvolvimento.
    this.logger.log(`Token de reset para ${email}: ${token}`);
  }

  async resetPassword(token: string, novaSenha: string): Promise<void> {
    const tokenSalvo = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
    });

    const valido = tokenSalvo && !tokenSalvo.usado && tokenSalvo.expiraEm > new Date();
    if (!tokenSalvo || !valido) {
      throw new UnauthorizedException('Token de recuperação inválido ou expirado');
    }

    const senhaHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: tokenSalvo.userId },
        data: { senhaHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: tokenSalvo.id },
        data: { usado: true },
      }),
      // Derruba todas as sessões ativas após troca de senha.
      this.prisma.refreshToken.updateMany({
        where: { userId: tokenSalvo.userId, revogado: false },
        data: { revogado: true },
      }),
    ]);
  }

  private async gerarSessao(user: User): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: ACCESS_TOKEN_TTL });

    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiraEm: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken, user: this.toUserDto(user) };
  }

  private toUserDto(user: User): AuthResponse['user'] {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
