import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CriarContestacaoInput, ResolverContestacaoInput } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { serializarContestacao } from './eleicao.util';

@Injectable()
export class ContestacaoService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(userId: string, eleicaoId: string, chapaId: string, input: CriarContestacaoInput) {
    const afiliado = await this.prisma.afiliado.findUnique({
      where: { userId },
      select: { id: true, status: true },
    });
    if (afiliado?.status !== 'APROVADO') {
      throw new ForbiddenException('Afiliação ainda não aprovada');
    }

    const chapa = await this.prisma.chapa.findFirst({ where: { id: chapaId, eleicaoId } });
    if (!chapa) {
      throw new NotFoundException('Chapa não encontrada nesta eleição');
    }
    if (chapa.status === 'INSCRITA') {
      throw new ConflictException('Esta chapa ainda não foi julgada pela Comissão Eleitoral');
    }
    if (!chapa.prazoContestacaoFim || new Date() > chapa.prazoContestacaoFim) {
      throw new ConflictException('O prazo para impugnação/recurso desta chapa já se encerrou');
    }

    const tipo = chapa.status === 'HOMOLOGADA' ? 'IMPUGNACAO' : 'RECURSO';

    const contestacao = await this.prisma.contestacaoChapa.create({
      data: { chapaId, tipo, afiliadoId: afiliado.id, motivo: input.motivo },
    });
    return serializarContestacao(contestacao);
  }

  async listar(eleicaoId: string) {
    const lista = await this.prisma.contestacaoChapa.findMany({
      where: { chapa: { eleicaoId } },
      orderBy: { createdAt: 'desc' },
    });
    return lista.map(serializarContestacao);
  }

  async resolver(
    userId: string,
    eleicaoId: string,
    contestacaoId: string,
    input: ResolverContestacaoInput,
  ) {
    const contestacao = await this.prisma.contestacaoChapa.findFirst({
      where: { id: contestacaoId, chapa: { eleicaoId } },
      include: { chapa: { select: { status: true } } },
    });
    if (!contestacao) {
      throw new NotFoundException('Contestação não encontrada');
    }
    if (contestacao.status !== 'ABERTA') {
      throw new ConflictException('Esta contestação já foi decidida');
    }

    const novoStatusChapa =
      input.status === 'DEFERIDA'
        ? contestacao.tipo === 'IMPUGNACAO'
          ? 'NAO_HOMOLOGADA'
          : 'HOMOLOGADA'
        : contestacao.chapa.status;

    const atualizada = await this.prisma.$transaction(async (tx) => {
      const decisao = await tx.contestacaoChapa.update({
        where: { id: contestacaoId },
        data: {
          status: input.status,
          decisao: input.decisao,
          decididoPorUserId: userId,
          decididoEm: new Date(),
        },
      });
      await tx.chapa.update({
        where: { id: contestacao.chapaId },
        data: { status: novoStatusChapa },
      });
      return decisao;
    });

    return serializarContestacao(atualizada);
  }
}
