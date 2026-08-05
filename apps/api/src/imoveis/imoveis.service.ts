import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarImovelInput,
  ConsultaDisponibilidadeInput,
  CriarImovelInput,
  CriarPeriodoInput,
  FiltroImoveisInput,
} from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';
import {
  intervalosSobrepostos,
  serializarImovel,
  serializarPeriodo,
  whereSobreposicao,
} from './imoveis.util';

const includeFotos = { fotos: { orderBy: { ordem: 'asc' as const } } };

@Injectable()
export class ImoveisService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(input: CriarImovelInput) {
    const imovel = await this.prisma.imovel.create({
      data: {
        tenantId: requireTenantId(),
        titulo: input.titulo,
        descricao: input.descricao,
        endereco: input.endereco,
        valor: input.valor,
        comodidades: input.comodidades,
        ativo: input.ativo,
      },
      include: includeFotos,
    });
    return serializarImovel(imovel);
  }

  async atualizar(id: string, input: AtualizarImovelInput) {
    try {
      const imovel = await this.prisma.imovel.update({
        where: { id },
        data: this.montarDados(input),
        include: includeFotos,
      });
      return serializarImovel(imovel);
    } catch (error) {
      throw this.tratarNaoEncontrado(error);
    }
  }

  async remover(id: string): Promise<void> {
    try {
      await this.prisma.imovel.delete({ where: { id } });
    } catch (error) {
      throw this.tratarNaoEncontrado(error);
    }
  }

  listarAdmin() {
    return this.prisma.imovel
      .findMany({ include: includeFotos, orderBy: { createdAt: 'desc' } })
      .then((lista) => lista.map(serializarImovel));
  }

  async buscarAdmin(id: string) {
    const imovel = await this.prisma.imovel.findUnique({
      where: { id },
      include: includeFotos,
    });
    if (!imovel) {
      throw new NotFoundException('Imóvel não encontrado');
    }
    return serializarImovel(imovel);
  }

  listarPublico({ busca }: FiltroImoveisInput) {
    const where: Prisma.ImovelWhereInput = { ativo: true };
    if (busca) {
      where.OR = [
        { titulo: { contains: busca, mode: 'insensitive' } },
        { descricao: { contains: busca, mode: 'insensitive' } },
        { endereco: { contains: busca, mode: 'insensitive' } },
      ];
    }
    return this.prisma.imovel
      .findMany({ where, include: includeFotos, orderBy: { titulo: 'asc' } })
      .then((lista) => lista.map(serializarImovel));
  }

  async buscarPublico(id: string) {
    const imovel = await this.prisma.imovel.findUnique({
      where: { id },
      include: includeFotos,
    });
    if (!imovel || !imovel.ativo) {
      throw new NotFoundException('Imóvel não encontrado');
    }
    return serializarImovel(imovel);
  }

  async adicionarFotos(id: string, urls: string[]) {
    await this.buscarAdmin(id);
    const ordemBase = await this.prisma.fotoImovel.count({ where: { imovelId: id } });
    const tenantId = requireTenantId();
    await this.prisma.fotoImovel.createMany({
      data: urls.map((url, indice) => ({
        tenantId,
        imovelId: id,
        url,
        ordem: ordemBase + indice,
      })),
    });
    return this.buscarAdmin(id);
  }

  async removerFoto(imovelId: string, fotoId: string): Promise<void> {
    const foto = await this.prisma.fotoImovel.findFirst({
      where: { id: fotoId, imovelId },
    });
    if (!foto) {
      throw new NotFoundException('Foto não encontrada');
    }
    await this.prisma.fotoImovel.delete({ where: { id: fotoId } });
  }

  async consultarDisponibilidade(imovelId: string, consulta: ConsultaDisponibilidadeInput) {
    await this.buscarPublico(imovelId);
    const periodos = await this.prisma.periodo.findMany({
      where: { imovelId, ...whereSobreposicao(consulta.inicio, consulta.fim) },
      orderBy: { inicio: 'asc' },
    });
    return {
      disponivel: periodos.length === 0,
      periodos: periodos.map(serializarPeriodo),
    };
  }

  async criarPeriodo(imovelId: string, input: CriarPeriodoInput) {
    await this.buscarAdmin(imovelId);
    const conflitos = await this.prisma.periodo.findMany({
      where: { imovelId, ...whereSobreposicao(input.inicio, input.fim) },
    });
    if (conflitos.length > 0) {
      throw new ConflictException('O intervalo sobrepõe um período já cadastrado');
    }
    const periodo = await this.prisma.periodo.create({
      data: {
        tenantId: requireTenantId(),
        imovelId,
        inicio: input.inicio,
        fim: input.fim,
        tipo: input.tipo,
      },
    });
    return serializarPeriodo(periodo);
  }

  async removerPeriodo(imovelId: string, periodoId: string): Promise<void> {
    const periodo = await this.prisma.periodo.findFirst({
      where: { id: periodoId, imovelId },
    });
    if (!periodo) {
      throw new NotFoundException('Período não encontrado');
    }
    await this.prisma.periodo.delete({ where: { id: periodoId } });
  }

  async listarPeriodos(imovelId: string) {
    await this.buscarAdmin(imovelId);
    const periodos = await this.prisma.periodo.findMany({
      where: { imovelId },
      orderBy: { inicio: 'asc' },
    });
    return periodos.map(serializarPeriodo);
  }

  /** Usado em testes e validações internas. */
  validarSobreposicao(inicio: Date, fim: Date, existentes: { inicio: Date; fim: Date }[]): boolean {
    return existentes.some((periodo) =>
      intervalosSobrepostos(inicio, fim, periodo.inicio, periodo.fim),
    );
  }

  private montarDados(input: AtualizarImovelInput): Prisma.ImovelUncheckedUpdateInput {
    const dados: Prisma.ImovelUncheckedUpdateInput = {};
    if (input.titulo !== undefined) dados.titulo = input.titulo;
    if (input.descricao !== undefined) dados.descricao = input.descricao;
    if (input.endereco !== undefined) dados.endereco = input.endereco;
    if (input.valor !== undefined) dados.valor = input.valor;
    if (input.comodidades !== undefined) dados.comodidades = input.comodidades;
    if (input.ativo !== undefined) dados.ativo = input.ativo;
    return dados;
  }

  private tratarNaoEncontrado(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return new NotFoundException('Imóvel não encontrado');
    }
    return error;
  }
}
