import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AtualizarEleicaoInput, CriarEleicaoInput } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { serializarEleicaoDetalhe, serializarEleicaoResumo } from './eleicao.util';

const includeChapasComCandidatos = {
  chapas: { include: { candidatos: true }, orderBy: { numero: 'asc' } },
} satisfies Prisma.EleicaoInclude;

@Injectable()
export class EleicaoService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(input: CriarEleicaoInput) {
    const eleicao = await this.prisma.eleicao.create({
      data: {
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        inicio: input.inicio,
        fim: input.fim,
        inscricaoInicio: input.inscricaoInicio ?? null,
        inscricaoFim: input.inscricaoFim ?? null,
      },
    });
    return serializarEleicaoResumo(eleicao);
  }

  async atualizar(id: string, input: AtualizarEleicaoInput) {
    const eleicao = await this.buscarOuFalhar(id);
    if (eleicao.status !== 'AGENDADA') {
      throw new ConflictException('Só é possível editar uma eleição enquanto AGENDADA');
    }

    const dados: Prisma.EleicaoUpdateInput = {};
    if (input.titulo !== undefined) dados.titulo = input.titulo;
    if (input.descricao !== undefined) dados.descricao = input.descricao;
    if (input.inicio !== undefined) dados.inicio = input.inicio;
    if (input.fim !== undefined) dados.fim = input.fim;
    if (input.inscricaoInicio !== undefined) dados.inscricaoInicio = input.inscricaoInicio;
    if (input.inscricaoFim !== undefined) dados.inscricaoFim = input.inscricaoFim;

    const atualizada = await this.prisma.eleicao.update({ where: { id }, data: dados });
    return serializarEleicaoResumo(atualizada);
  }

  async remover(id: string): Promise<void> {
    const eleicao = await this.buscarOuFalhar(id);
    if (eleicao.status !== 'AGENDADA') {
      throw new ConflictException('Só é possível remover uma eleição enquanto AGENDADA');
    }
    await this.prisma.eleicao.delete({ where: { id } });
  }

  async listarAdmin() {
    const lista = await this.prisma.eleicao.findMany({ orderBy: { createdAt: 'desc' } });
    return lista.map(serializarEleicaoResumo);
  }

  async buscarAdminDetalhe(id: string) {
    const eleicao = await this.prisma.eleicao.findUnique({
      where: { id },
      include: includeChapasComCandidatos,
    });
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }

    const [totalElegiveis, totalComparecimentos] = await Promise.all([
      this.prisma.elegivel.count({ where: { eleicaoId: id } }),
      this.prisma.comparecimento.count({ where: { eleicaoId: id } }),
    ]);

    return {
      ...serializarEleicaoDetalhe(eleicao),
      inscricaoInicio: eleicao.inscricaoInicio,
      inscricaoFim: eleicao.inscricaoFim,
      totalElegiveis,
      totalComparecimentos,
    };
  }

  async listarVisiveis() {
    const lista = await this.prisma.eleicao.findMany({ orderBy: { inicio: 'desc' } });
    return lista.map(serializarEleicaoResumo);
  }

  async buscarDetalhePublico(id: string) {
    const eleicao = await this.prisma.eleicao.findUnique({
      where: { id },
      include: includeChapasComCandidatos,
    });
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }
    return serializarEleicaoDetalhe(eleicao);
  }

  async abrir(id: string) {
    const eleicao = await this.buscarOuFalhar(id);
    if (eleicao.status !== 'AGENDADA') {
      throw new ConflictException('Só é possível abrir uma eleição AGENDADA');
    }

    const chapaPendente = await this.prisma.chapa.findFirst({
      where: { eleicaoId: id, status: 'INSCRITA' },
    });
    if (chapaPendente) {
      throw new ConflictException(
        'Existem chapas ainda não homologadas. Decida a homologação antes de abrir a votação.',
      );
    }

    const agora = new Date();
    const contestacaoPendente = await this.prisma.contestacaoChapa.findFirst({
      where: {
        status: 'ABERTA',
        chapa: { eleicaoId: id, prazoContestacaoFim: { gt: agora } },
      },
    });
    if (contestacaoPendente) {
      throw new ConflictException(
        'Existem impugnações/recursos em aberto dentro do prazo. Resolva antes de abrir a votação.',
      );
    }

    const atualizada = await this.prisma.eleicao.update({
      where: { id },
      data: { status: 'ABERTA' },
    });
    return serializarEleicaoResumo(atualizada);
  }

  async encerrar(id: string) {
    const eleicao = await this.buscarOuFalhar(id);
    if (eleicao.status !== 'ABERTA') {
      throw new ConflictException('Só é possível encerrar uma eleição ABERTA');
    }
    const atualizada = await this.prisma.eleicao.update({
      where: { id },
      data: { status: 'ENCERRADA' },
    });
    return serializarEleicaoResumo(atualizada);
  }

  async buscarOuFalhar(id: string) {
    const eleicao = await this.prisma.eleicao.findUnique({ where: { id } });
    if (!eleicao) {
      throw new NotFoundException('Eleição não encontrada');
    }
    return eleicao;
  }
}
