import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Eleicao } from '@prisma/client';
import type { ResultadoEleicao } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';

@Injectable()
export class ApuracaoService {
  constructor(private readonly prisma: PrismaService) {}

  // Só ENCERRADA pode ser apurada; idempotente se já APURADA (não recalcula
  // silenciosamente). Reprodutível: Voto nunca é alterado após criado.
  async apurar(eleicaoId: string): Promise<ResultadoEleicao> {
    const eleicao = await this.prisma.eleicao.findUnique({ where: { id: eleicaoId } });
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }
    if (eleicao.status === 'APURADA') {
      return this.buscarResultado(eleicaoId, eleicao);
    }
    if (eleicao.status !== 'ENCERRADA') {
      throw new ConflictException('A eleição precisa estar ENCERRADA para ser apurada');
    }

    const chapasHomologadas = await this.prisma.chapa.findMany({
      where: { eleicaoId, status: 'HOMOLOGADA' },
      select: { id: true },
    });
    const contagem = await this.prisma.voto.groupBy({
      by: ['chapaId'],
      where: { eleicaoId },
      _count: { _all: true },
    });
    const votosPorChapa = new Map(contagem.map((item) => [item.chapaId, item._count._all]));
    const totalVotos = contagem.reduce((soma, item) => soma + item._count._all, 0);

    await this.prisma.$transaction(async (tx) => {
      for (const chapa of chapasHomologadas) {
        const votos = votosPorChapa.get(chapa.id) ?? 0;
        await tx.resultadoApuracao.create({
          data: {
            tenantId: requireTenantId(),
            eleicaoId,
            chapaId: chapa.id,
            totalVotos: votos,
            percentual: totalVotos > 0 ? (votos / totalVotos) * 100 : 0,
          },
        });
      }
      await tx.eleicao.update({ where: { id: eleicaoId }, data: { status: 'APURADA' } });
    });

    return this.buscarResultado(eleicaoId, eleicao);
  }

  // Nem admin vê resultado parcial enquanto não ENCERRADA/APURADA.
  async resultado(eleicaoId: string): Promise<ResultadoEleicao> {
    const eleicao = await this.prisma.eleicao.findUnique({ where: { id: eleicaoId } });
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }
    if (eleicao.status !== 'APURADA') {
      throw new ConflictException('O resultado só fica disponível após a apuração');
    }
    return this.buscarResultado(eleicaoId, eleicao);
  }

  // Art. 38 caput: chapa única não passa por escrutínio secreto, é decidida
  // por aclamação em Assembleia. Só válido com exatamente 1 chapa HOMOLOGADA
  // e nenhuma contestação em aberto; pula ABERTA/ENCERRADA (não há urna).
  async resolverPorAclamacao(eleicaoId: string, chapaId: string): Promise<ResultadoEleicao> {
    const eleicao = await this.prisma.eleicao.findUnique({ where: { id: eleicaoId } });
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }
    if (eleicao.status !== 'AGENDADA') {
      throw new ConflictException(
        'Só é possível resolver por aclamação enquanto a eleição está AGENDADA',
      );
    }

    const chapas = await this.prisma.chapa.findMany({ where: { eleicaoId } });
    const homologadas = chapas.filter((chapa) => chapa.status === 'HOMOLOGADA');
    if (homologadas.length !== 1 || homologadas[0]?.id !== chapaId) {
      throw new ConflictException(
        'A resolução por aclamação só é permitida quando há exatamente uma chapa homologada',
      );
    }

    const contestacaoPendente = await this.prisma.contestacaoChapa.findFirst({
      where: { chapaId, status: 'ABERTA' },
    });
    if (contestacaoPendente) {
      throw new ConflictException('Existem contestações em aberto para esta chapa');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.resultadoApuracao.create({
        data: {
          tenantId: requireTenantId(),
          eleicaoId,
          chapaId,
          totalVotos: 0,
          percentual: 100,
          porAclamacao: true,
        },
      });
      await tx.eleicao.update({
        where: { id: eleicaoId },
        data: { status: 'APURADA', resolvidaPorAclamacao: true },
      });
    });

    return this.buscarResultado(eleicaoId, { resolvidaPorAclamacao: true });
  }

  private async buscarResultado(
    eleicaoId: string,
    eleicao: Pick<Eleicao, 'resolvidaPorAclamacao'>,
  ): Promise<ResultadoEleicao> {
    const resultados = await this.prisma.resultadoApuracao.findMany({
      where: { eleicaoId },
      include: { chapa: { select: { numero: true, nome: true } } },
      orderBy: { totalVotos: 'desc' },
    });

    const totalVotos = resultados.reduce((soma, item) => soma + item.totalVotos, 0);
    const apuradoEm = resultados[0]?.apuradoEm ?? new Date();

    return {
      eleicaoId,
      porAclamacao: eleicao.resolvidaPorAclamacao,
      apuradoEm,
      totalVotos,
      resultados: resultados.map((item) => ({
        chapaId: item.chapaId,
        numero: item.chapa.numero,
        nome: item.chapa.nome,
        totalVotos: item.totalVotos,
        percentual: item.percentual,
      })),
    };
  }
}
