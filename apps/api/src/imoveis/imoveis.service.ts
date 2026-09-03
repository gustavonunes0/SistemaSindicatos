import {
  BadRequestException,
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
  DefinirImoveisConfigInput,
  FiltroImoveisInput,
  ImoveisConfig,
  ImoveisModo,
} from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';
import { TenantService } from '../tenant/tenant.service';
import {
  intervalosSobrepostos,
  serializarImovel,
  serializarPeriodo,
  whereSobreposicao,
} from './imoveis.util';

const includeFotos = { fotos: { orderBy: { ordem: 'asc' as const } } };

@Injectable()
export class ImoveisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
  ) {}

  /**
   * Modo da área do filiado + link externo de reserva.
   * Guardado no branding: o front já recebe isso no bootstrap.
   */
  async definirConfig(input: DefinirImoveisConfigInput): Promise<ImoveisConfig> {
    const tenantId = requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { branding: true },
    });

    if (!tenant?.branding || typeof tenant.branding !== 'object' || Array.isArray(tenant.branding)) {
      throw new BadRequestException('Este sindicato ainda não tem identidade visual configurada');
    }

    const branding = { ...(tenant.branding as Prisma.JsonObject) };
    branding.imoveisModo = input.modo;

    if (input.reservaUrl !== undefined) {
      branding.reservaApartamentosUrl = input.reservaUrl;
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { branding },
    });

    this.tenantService.invalidarCache();

    return {
      modo: input.modo,
      reservaUrl:
        typeof branding.reservaApartamentosUrl === 'string'
          ? branding.reservaApartamentosUrl
          : null,
    };
  }

  lerConfigDoBranding(branding: unknown): ImoveisConfig {
    if (!branding || typeof branding !== 'object' || Array.isArray(branding)) {
      return { modo: 'VITRINE', reservaUrl: null };
    }
    const dados = branding as Record<string, unknown>;
    const modo: ImoveisModo = dados.imoveisModo === 'LINK' ? 'LINK' : 'VITRINE';
    const reservaUrl =
      typeof dados.reservaApartamentosUrl === 'string' ? dados.reservaApartamentosUrl : null;
    return { modo, reservaUrl };
  }

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
    const [, ordemBase] = await Promise.all([
      this.buscarAdmin(id),
      this.prisma.fotoImovel.count({ where: { imovelId: id } }),
    ]);
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
    const { count } = await this.prisma.fotoImovel.deleteMany({
      where: { id: fotoId, imovelId },
    });
    if (count === 0) {
      throw new NotFoundException('Foto não encontrada');
    }
  }

  async consultarDisponibilidade(imovelId: string, consulta: ConsultaDisponibilidadeInput) {
    const [, periodos] = await Promise.all([
      this.buscarPublico(imovelId),
      this.prisma.periodo.findMany({
        where: { imovelId, ...whereSobreposicao(consulta.inicio, consulta.fim) },
        orderBy: { inicio: 'asc' },
      }),
    ]);
    return {
      disponivel: periodos.length === 0,
      periodos: periodos.map(serializarPeriodo),
    };
  }

  async criarPeriodo(imovelId: string, input: CriarPeriodoInput) {
    const [, conflitos] = await Promise.all([
      this.buscarAdmin(imovelId),
      this.prisma.periodo.findMany({
        where: { imovelId, ...whereSobreposicao(input.inicio, input.fim) },
        select: { id: true },
      }),
    ]);
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
    const { count } = await this.prisma.periodo.deleteMany({
      where: { id: periodoId, imovelId },
    });
    if (count === 0) {
      throw new NotFoundException('Período não encontrado');
    }
  }

  async listarPeriodos(imovelId: string) {
    const [, periodos] = await Promise.all([
      this.buscarAdmin(imovelId),
      this.prisma.periodo.findMany({
        where: { imovelId },
        orderBy: { inicio: 'asc' },
      }),
    ]);
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
