import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarCandidatoInput,
  AtualizarChapaInput,
  CriarCandidatoInput,
  CriarChapaInput,
  HomologarChapaInput,
} from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';
import { serializarChapa } from './eleicao.util';
import { adicionarDiasUteis } from './prazo.util';

const PRAZO_CONTESTACAO_DIAS_UTEIS = 3;

const CANDIDATOS_DA_CHAPA = {
  candidatos: {
    select: { id: true, chapaId: true, nome: true, cargo: true, fotoUrl: true },
  },
} as const;

@Injectable()
export class ChapaService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(eleicaoId: string, input: CriarChapaInput) {
    await this.garantirEleicaoEditavel(eleicaoId);
    try {
      const chapa = await this.prisma.chapa.create({
        data: {
          tenantId: requireTenantId(),
          eleicaoId,
          numero: input.numero,
          nome: input.nome,
          slogan: input.slogan ?? null,
        },
        include: CANDIDATOS_DA_CHAPA,
      });
      return serializarChapa(chapa);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe uma chapa com este número nesta eleição');
      }
      throw error;
    }
  }

  async atualizar(eleicaoId: string, chapaId: string, input: AtualizarChapaInput) {
    await this.validarChapaEditavel(eleicaoId, chapaId);

    const dados: Prisma.ChapaUpdateInput = {};
    if (input.numero !== undefined) dados.numero = input.numero;
    if (input.nome !== undefined) dados.nome = input.nome;
    if (input.slogan !== undefined) dados.slogan = input.slogan;

    const atualizada = await this.prisma.chapa.update({
      where: { id: chapaId },
      data: dados,
      include: CANDIDATOS_DA_CHAPA,
    });
    return serializarChapa(atualizada);
  }

  async remover(eleicaoId: string, chapaId: string): Promise<void> {
    await this.validarChapaEditavel(eleicaoId, chapaId);
    await this.prisma.chapa.delete({ where: { id: chapaId } });
  }

  async homologar(eleicaoId: string, chapaId: string, input: HomologarChapaInput) {
    await this.validarChapaEditavel(eleicaoId, chapaId);

    const agora = new Date();
    const atualizada = await this.prisma.chapa.update({
      where: { id: chapaId },
      data: {
        status: input.status,
        justificativaHomologacao: input.justificativa,
        homologadaEm: agora,
        prazoContestacaoFim: adicionarDiasUteis(agora, PRAZO_CONTESTACAO_DIAS_UTEIS),
      },
      include: CANDIDATOS_DA_CHAPA,
    });
    return serializarChapa(atualizada);
  }

  async criarCandidato(eleicaoId: string, chapaId: string, input: CriarCandidatoInput) {
    await this.validarChapaEditavel(eleicaoId, chapaId);

    const chapa = await this.prisma.chapa.update({
      where: { id: chapaId },
      data: {
        candidatos: {
          create: {
            // Extension de tenant não alcança writes aninhados — informar explicitamente.
            tenantId: requireTenantId(),
            nome: input.nome,
            cargo: input.cargo,
            fotoUrl: input.fotoUrl ?? null,
          },
        },
      },
      include: CANDIDATOS_DA_CHAPA,
    });
    return serializarChapa(chapa);
  }

  async atualizarCandidato(
    eleicaoId: string,
    chapaId: string,
    candidatoId: string,
    input: AtualizarCandidatoInput,
  ) {
    await this.validarCandidatoEditavel(eleicaoId, chapaId, candidatoId);

    const dados: Prisma.CandidatoUpdateWithoutChapaInput = {};
    if (input.nome !== undefined) dados.nome = input.nome;
    if (input.cargo !== undefined) dados.cargo = input.cargo;
    if (input.fotoUrl !== undefined) dados.fotoUrl = input.fotoUrl;

    const chapa = await this.prisma.chapa.update({
      where: { id: chapaId },
      data: { candidatos: { update: { where: { id: candidatoId }, data: dados } } },
      include: CANDIDATOS_DA_CHAPA,
    });
    return serializarChapa(chapa);
  }

  async removerCandidato(eleicaoId: string, chapaId: string, candidatoId: string): Promise<void> {
    await this.validarCandidatoEditavel(eleicaoId, chapaId, candidatoId);
    await this.prisma.candidato.delete({ where: { id: candidatoId } });
  }

  /**
   * Valida eleição AGENDADA + chapa pertencente a ela em uma única consulta.
   * O caminho de erro faz consultas extras só para distinguir a causa.
   */
  private async validarChapaEditavel(eleicaoId: string, chapaId: string): Promise<void> {
    const chapa = await this.prisma.chapa.findFirst({
      where: { id: chapaId, eleicaoId },
      select: { id: true, eleicao: { select: { status: true } } },
    });

    if (!chapa) {
      await this.garantirEleicaoEditavel(eleicaoId);
      throw new NotFoundException('Chapa não encontrada nesta eleição');
    }
    this.garantirStatusAgendada(chapa.eleicao.status);
  }

  /** Mesma ideia: eleição + chapa + candidato validados em uma consulta. */
  private async validarCandidatoEditavel(
    eleicaoId: string,
    chapaId: string,
    candidatoId: string,
  ): Promise<void> {
    const candidato = await this.prisma.candidato.findFirst({
      where: { id: candidatoId, chapaId, chapa: { eleicaoId } },
      select: { id: true, chapa: { select: { eleicao: { select: { status: true } } } } },
    });

    if (!candidato) {
      await this.validarChapaEditavel(eleicaoId, chapaId);
      throw new NotFoundException('Candidato não encontrado nesta chapa');
    }
    this.garantirStatusAgendada(candidato.chapa.eleicao.status);
  }

  private garantirStatusAgendada(status: string): void {
    if (status !== 'AGENDADA') {
      throw new ConflictException(
        'Só é possível gerir chapas/candidatos enquanto a eleição está AGENDADA',
      );
    }
  }

  private async garantirEleicaoEditavel(eleicaoId: string): Promise<void> {
    const eleicao = await this.prisma.eleicao.findUnique({
      where: { id: eleicaoId },
      select: { status: true },
    });
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }
    this.garantirStatusAgendada(eleicao.status);
  }
}
