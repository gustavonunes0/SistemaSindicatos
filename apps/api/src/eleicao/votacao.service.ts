import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { ComprovanteVoto, MeuStatusVotacao } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VotacaoService {
  private readonly logger = new Logger(VotacaoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async meuStatus(userId: string, eleicaoId: string): Promise<MeuStatusVotacao> {
    const afiliado = await this.buscarAfiliadoAprovado(userId);

    const [elegivel, comparecimento] = await Promise.all([
      this.prisma.elegivel.findUnique({
        where: { eleicaoId_afiliadoId: { eleicaoId, afiliadoId: afiliado.id } },
      }),
      this.prisma.comparecimento.findUnique({
        where: { eleicaoId_afiliadoId: { eleicaoId, afiliadoId: afiliado.id } },
      }),
    ]);

    return {
      elegivel: Boolean(elegivel),
      jaVotou: Boolean(comparecimento),
      protocolo: comparecimento?.protocolo ?? null,
      votouEm: comparecimento?.votouEm ?? null,
    };
  }

  // Núcleo crítico do módulo — ver .cursor/rules/eleicao.mdc.
  // Sigilo: Comparecimento e Voto são gravados na mesma transação, mas em
  // tabelas SEM relação entre si (Voto nunca referencia o afiliado).
  // Voto único: a constraint @@unique([eleicaoId, afiliadoId]) de
  // Comparecimento é a garantia real contra requisições concorrentes —
  // a checagem de elegibilidade abaixo é só uma otimização de UX.
  async votar(userId: string, eleicaoId: string, chapaId: string): Promise<ComprovanteVoto> {
    const afiliado = await this.buscarAfiliadoAprovado(userId);

    const eleicao = await this.prisma.eleicao.findUnique({ where: { id: eleicaoId } });
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }
    if (eleicao.status !== 'ABERTA') {
      throw new ConflictException('Esta eleição não está aberta para votação');
    }

    const agora = new Date();
    if (agora < eleicao.inicio || agora > eleicao.fim) {
      throw new ConflictException('Fora da janela de votação');
    }

    const elegivel = await this.prisma.elegivel.findUnique({
      where: { eleicaoId_afiliadoId: { eleicaoId, afiliadoId: afiliado.id } },
    });
    if (!elegivel) {
      throw new ForbiddenException('Você não está na lista de elegíveis desta eleição');
    }

    const chapa = await this.prisma.chapa.findFirst({ where: { id: chapaId, eleicaoId } });
    if (!chapa) {
      throw new NotFoundException('Chapa não encontrada nesta eleição');
    }
    if (chapa.status !== 'HOMOLOGADA') {
      throw new ConflictException('Esta chapa não está homologada');
    }

    const protocolo = randomBytes(16).toString('hex');

    try {
      const comparecimento = await this.prisma.$transaction(async (tx) => {
        const registro = await tx.comparecimento.create({
          data: { eleicaoId, afiliadoId: afiliado.id, protocolo },
        });
        await tx.voto.create({ data: { eleicaoId, chapaId } });
        return registro;
      });

      this.logger.log(`Comparecimento registrado na eleição ${eleicaoId} (protocolo ${protocolo})`);

      return { protocolo: comparecimento.protocolo, votouEm: comparecimento.votouEm };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Você já registrou seu voto nesta eleição');
      }
      throw error;
    }
  }

  private async buscarAfiliadoAprovado(userId: string) {
    const afiliado = await this.prisma.afiliado.findUnique({
      where: { userId },
      select: { id: true, status: true },
    });
    if (afiliado?.status !== 'APROVADO') {
      throw new ForbiddenException('Afiliação ainda não aprovada');
    }
    return afiliado;
  }
}
