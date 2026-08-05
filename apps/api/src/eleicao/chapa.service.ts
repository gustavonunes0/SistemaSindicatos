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
        include: { candidatos: true },
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
    await this.garantirEleicaoEditavel(eleicaoId);
    const chapa = await this.buscarChapaDaEleicao(eleicaoId, chapaId);

    const dados: Prisma.ChapaUpdateInput = {};
    if (input.numero !== undefined) dados.numero = input.numero;
    if (input.nome !== undefined) dados.nome = input.nome;
    if (input.slogan !== undefined) dados.slogan = input.slogan;

    const atualizada = await this.prisma.chapa.update({
      where: { id: chapa.id },
      data: dados,
      include: { candidatos: true },
    });
    return serializarChapa(atualizada);
  }

  async remover(eleicaoId: string, chapaId: string): Promise<void> {
    await this.garantirEleicaoEditavel(eleicaoId);
    await this.buscarChapaDaEleicao(eleicaoId, chapaId);
    await this.prisma.chapa.delete({ where: { id: chapaId } });
  }

  async homologar(eleicaoId: string, chapaId: string, input: HomologarChapaInput) {
    await this.garantirEleicaoEditavel(eleicaoId);
    const chapa = await this.buscarChapaDaEleicao(eleicaoId, chapaId);

    const agora = new Date();
    const atualizada = await this.prisma.chapa.update({
      where: { id: chapa.id },
      data: {
        status: input.status,
        justificativaHomologacao: input.justificativa,
        homologadaEm: agora,
        prazoContestacaoFim: adicionarDiasUteis(agora, PRAZO_CONTESTACAO_DIAS_UTEIS),
      },
      include: { candidatos: true },
    });
    return serializarChapa(atualizada);
  }

  async criarCandidato(eleicaoId: string, chapaId: string, input: CriarCandidatoInput) {
    await this.garantirEleicaoEditavel(eleicaoId);
    await this.buscarChapaDaEleicao(eleicaoId, chapaId);

    await this.prisma.candidato.create({
      data: {
        tenantId: requireTenantId(),
        chapaId,
        nome: input.nome,
        cargo: input.cargo,
        fotoUrl: input.fotoUrl ?? null,
      },
    });
    return this.buscarChapaComCandidatos(chapaId);
  }

  async atualizarCandidato(
    eleicaoId: string,
    chapaId: string,
    candidatoId: string,
    input: AtualizarCandidatoInput,
  ) {
    await this.garantirEleicaoEditavel(eleicaoId);
    await this.buscarChapaDaEleicao(eleicaoId, chapaId);
    await this.buscarCandidatoDaChapa(chapaId, candidatoId);

    const dados: Prisma.CandidatoUpdateInput = {};
    if (input.nome !== undefined) dados.nome = input.nome;
    if (input.cargo !== undefined) dados.cargo = input.cargo;
    if (input.fotoUrl !== undefined) dados.fotoUrl = input.fotoUrl;

    await this.prisma.candidato.update({ where: { id: candidatoId }, data: dados });
    return this.buscarChapaComCandidatos(chapaId);
  }

  async removerCandidato(eleicaoId: string, chapaId: string, candidatoId: string): Promise<void> {
    await this.garantirEleicaoEditavel(eleicaoId);
    await this.buscarChapaDaEleicao(eleicaoId, chapaId);
    await this.buscarCandidatoDaChapa(chapaId, candidatoId);
    await this.prisma.candidato.delete({ where: { id: candidatoId } });
  }

  private async buscarChapaComCandidatos(chapaId: string) {
    const chapa = await this.prisma.chapa.findUniqueOrThrow({
      where: { id: chapaId },
      include: { candidatos: true },
    });
    return serializarChapa(chapa);
  }

  private async buscarChapaDaEleicao(eleicaoId: string, chapaId: string) {
    const chapa = await this.prisma.chapa.findFirst({ where: { id: chapaId, eleicaoId } });
    if (!chapa) {
      throw new NotFoundException('Chapa não encontrada nesta eleição');
    }
    return chapa;
  }

  private async buscarCandidatoDaChapa(chapaId: string, candidatoId: string) {
    const candidato = await this.prisma.candidato.findFirst({
      where: { id: candidatoId, chapaId },
    });
    if (!candidato) {
      throw new NotFoundException('Candidato não encontrado nesta chapa');
    }
    return candidato;
  }

  private async garantirEleicaoEditavel(eleicaoId: string): Promise<void> {
    const eleicao = await this.prisma.eleicao.findUnique({
      where: { id: eleicaoId },
      select: { status: true },
    });
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }
    if (eleicao.status !== 'AGENDADA') {
      throw new ConflictException(
        'Só é possível gerir chapas/candidatos enquanto a eleição está AGENDADA',
      );
    }
  }
}
