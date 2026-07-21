import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CadastroAfiliadoInput, StatusAfiliado } from '@sindprf/types';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AfiliadosService {
  constructor(private readonly prisma: PrismaService) {}

  async cadastrar(input: CadastroAfiliadoInput) {
    const senhaHash = await bcrypt.hash(input.senha, BCRYPT_ROUNDS);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: input.email, senhaHash, role: 'AFILIADO' },
        });
        return tx.afiliado.create({
          data: {
            userId: user.id,
            nome: input.nome,
            cpf: input.cpf,
            matricula: input.matricula,
            telefone: input.telefone ?? null,
            status: 'PENDENTE',
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email, CPF ou matrícula já cadastrado');
      }
      throw error;
    }
  }

  listar(status?: StatusAfiliado) {
    return this.prisma.afiliado.findMany({
      where: status ? { status } : undefined,
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async atualizarStatus(id: string, status: StatusAfiliado) {
    try {
      return await this.prisma.afiliado.update({ where: { id }, data: { status } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Afiliado não encontrado');
      }
      throw error;
    }
  }

  async atualizarSenha(id: string, novaSenha: string): Promise<void> {
    const afiliado = await this.prisma.afiliado.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!afiliado) {
      throw new NotFoundException('Afiliado não encontrado');
    }

    const senhaHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: afiliado.userId },
        data: { senhaHash },
      }),
      // Derruba sessões ativas após troca de senha pelo admin.
      this.prisma.refreshToken.updateMany({
        where: { userId: afiliado.userId, revogado: false },
        data: { revogado: true },
      }),
    ]);
  }
}
