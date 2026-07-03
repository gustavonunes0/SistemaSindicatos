import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarConvenioInput,
  CriarConvenioInput,
  FiltroConveniosInput,
} from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConveniosService {
  constructor(private readonly prisma: PrismaService) {}

  criar(input: CriarConvenioInput) {
    return this.prisma.convenio.create({ data: this.montarDados(input) });
  }

  async atualizar(id: string, input: AtualizarConvenioInput) {
    try {
      return await this.prisma.convenio.update({
        where: { id },
        data: this.montarDados(input),
      });
    } catch (error) {
      throw this.tratarNaoEncontrado(error);
    }
  }

  async remover(id: string): Promise<void> {
    try {
      await this.prisma.convenio.delete({ where: { id } });
    } catch (error) {
      throw this.tratarNaoEncontrado(error);
    }
  }

  listarAdmin() {
    return this.prisma.convenio.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async buscarAdmin(id: string) {
    const convenio = await this.prisma.convenio.findUnique({ where: { id } });
    if (!convenio) {
      throw new NotFoundException('Convênio não encontrado');
    }
    return convenio;
  }

  // Afiliado só enxerga convênios ativos.
  listarPublico({ categoria, busca }: FiltroConveniosInput) {
    const where: Prisma.ConvenioWhereInput = { ativo: true };
    if (categoria) {
      where.categoria = categoria;
    }
    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { descricao: { contains: busca, mode: 'insensitive' } },
      ];
    }
    return this.prisma.convenio.findMany({ where, orderBy: { nome: 'asc' } });
  }

  async buscarPublico(id: string) {
    const convenio = await this.prisma.convenio.findUnique({ where: { id } });
    if (!convenio || !convenio.ativo) {
      throw new NotFoundException('Convênio não encontrado');
    }
    return convenio;
  }

  async listarCategorias(): Promise<string[]> {
    const registros = await this.prisma.convenio.findMany({
      where: { ativo: true },
      distinct: ['categoria'],
      select: { categoria: true },
      orderBy: { categoria: 'asc' },
    });
    return registros.map((registro) => registro.categoria);
  }

  private montarDados(input: AtualizarConvenioInput): Prisma.ConvenioUncheckedCreateInput {
    // Só inclui as chaves presentes para não sobrescrever com undefined em update parcial.
    const dados: Prisma.ConvenioUncheckedCreateInput = {} as Prisma.ConvenioUncheckedCreateInput;
    if (input.nome !== undefined) dados.nome = input.nome;
    if (input.categoria !== undefined) dados.categoria = input.categoria;
    if (input.descricao !== undefined) dados.descricao = input.descricao;
    if (input.logoUrl !== undefined) dados.logoUrl = input.logoUrl;
    if (input.link !== undefined) dados.link = input.link;
    if (input.contato !== undefined) dados.contato = input.contato;
    if (input.vigenciaInicio !== undefined) dados.vigenciaInicio = input.vigenciaInicio;
    if (input.vigenciaFim !== undefined) dados.vigenciaFim = input.vigenciaFim;
    if (input.ativo !== undefined) dados.ativo = input.ativo;
    return dados;
  }

  private tratarNaoEncontrado(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return new NotFoundException('Convênio não encontrado');
    }
    return error;
  }
}
