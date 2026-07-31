import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarConvenioInput,
  CriarConvenioInput,
  EmitirDeclaracaoInput,
  FiltroConveniosInput,
} from '@sindprf/types';
import type { RequestUser } from '../common/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { DeclaracaoPdfService } from './declaracao-pdf.service';

@Injectable()
export class ConveniosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly declaracaoPdf: DeclaracaoPdfService,
  ) {}

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

  async emitirDeclaracao(
    user: RequestUser,
    convenioId: string,
    input: EmitirDeclaracaoInput,
  ): Promise<{ buffer: Buffer; nomeArquivo: string }> {
    const afiliado = await this.prisma.afiliado.findUnique({
      where: { userId: user.id },
      select: { nome: true, cpf: true, status: true },
    });
    if (!afiliado || afiliado.status !== 'APROVADO') {
      throw new ForbiddenException('Afiliação ainda não aprovada');
    }

    const convenio = await this.buscarPublico(convenioId);
    if (!convenio.emiteDeclaracao || !convenio.modeloDeclaracao || !convenio.destinoDeclaracao) {
      throw new BadRequestException('Este convênio não emite declaração');
    }

    if (convenio.modeloDeclaracao === 'DEPENDENTE') {
      if (!input.dependenteNome?.trim() || !input.dependenteCpf) {
        throw new BadRequestException('Informe o nome e o CPF do dependente');
      }
    }

    if (convenio.modeloDeclaracao === 'AUTORIZACAO_HOSPEDAGEM') {
      if (!input.periodoInicio || !input.periodoFim) {
        throw new BadRequestException('Informe o período de hospedagem');
      }
    }

    const buffer = await this.declaracaoPdf.gerar({
      modelo: convenio.modeloDeclaracao,
      destino: convenio.destinoDeclaracao,
      textoComplementar: convenio.textoComplementar,
      afiliadoNome: afiliado.nome,
      afiliadoCpf: afiliado.cpf,
      dependenteNome: input.dependenteNome,
      dependenteCpf: input.dependenteCpf,
      periodoInicio: input.periodoInicio,
      periodoFim: input.periodoFim,
    });

    const slug = convenio.nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 40);
    const nomeArquivo = `declaracao-${slug || 'convenio'}.pdf`;

    return { buffer, nomeArquivo };
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
    if (input.emiteDeclaracao !== undefined) dados.emiteDeclaracao = input.emiteDeclaracao;
    if (input.modeloDeclaracao !== undefined) dados.modeloDeclaracao = input.modeloDeclaracao;
    if (input.destinoDeclaracao !== undefined) dados.destinoDeclaracao = input.destinoDeclaracao;
    if (input.textoComplementar !== undefined) dados.textoComplementar = input.textoComplementar;
    return dados;
  }

  private tratarNaoEncontrado(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return new NotFoundException('Convênio não encontrado');
    }
    return error;
  }
}
