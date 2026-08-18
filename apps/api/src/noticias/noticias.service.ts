import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarNoticiaInput,
  CriarNoticiaInput,
  ListarNoticiasQuery,
} from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { requireTenantId } from '../tenant/tenant-context';
import { resumoDeConteudo } from './noticia-resumo';
import { gerarSlug } from '../common/slug';

const CAMPOS_LISTAGEM_PUBLICA = {
  id: true,
  titulo: true,
  slug: true,
  capaUrl: true,
  resumo: true,
  status: true,
  publicadoEm: true,
  autorId: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Admin: tabela só precisa de título/status/data. */
const CAMPOS_LISTAGEM_ADMIN = {
  id: true,
  titulo: true,
  slug: true,
  status: true,
  publicadoEm: true,
  createdAt: true,
} as const;

type ListaCache = {
  expires: number;
  payload: {
    items: unknown[];
    total: number;
    page: number;
    totalPages: number;
  };
};

@Injectable()
export class NoticiasService {
  private readonly cacheListagem = new Map<string, ListaCache>();
  private readonly cacheTtlMs = 120_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  private chaveCache(tenantId: string, page: number, limit: number): string {
    return `${tenantId}:${page}:${limit}`;
  }

  private invalidarCacheListagem(tenantId = requireTenantId()) {
    for (const chave of this.cacheListagem.keys()) {
      if (chave.startsWith(`${tenantId}:`)) {
        this.cacheListagem.delete(chave);
      }
    }
  }

  async criar(autorId: string, input: CriarNoticiaInput) {
    const tenantId = requireTenantId();
    const noticia = await this.prisma.noticia.create({
      data: {
        tenantId,
        titulo: input.titulo,
        slug: await this.slugDisponivel(gerarSlug(input.titulo)),
        conteudo: input.conteudo,
        resumo: resumoDeConteudo(input.conteudo),
        capaUrl: input.capaUrl ?? null,
        anexoUrl: input.anexoUrl ?? null,
        anexoNome: input.anexoNome ?? null,
        status: input.status,
        publicadoEm: input.status === 'PUBLICADO' ? new Date() : null,
        autorId,
      },
    });

    this.invalidarCacheListagem(tenantId);

    if (noticia.status === 'PUBLICADO') {
      void this.pushService.notificarNovaNoticia(noticia);
    }

    return noticia;
  }

  async atualizar(id: string, input: AtualizarNoticiaInput) {
    const noticia = await this.prisma.noticia.findUnique({ where: { id } });
    if (!noticia) {
      throw new NotFoundException('Notícia não encontrada');
    }

    const data: Prisma.NoticiaUpdateInput = {};
    if (input.titulo !== undefined && input.titulo !== noticia.titulo) {
      data.titulo = input.titulo;
      data.slug = await this.slugDisponivel(gerarSlug(input.titulo), id);
    }
    if (input.conteudo !== undefined) {
      data.conteudo = input.conteudo;
      data.resumo = resumoDeConteudo(input.conteudo);
    }
    if (input.capaUrl !== undefined) {
      data.capaUrl = input.capaUrl;
    }
    if (input.anexoUrl !== undefined) {
      data.anexoUrl = input.anexoUrl;
      data.anexoNome = input.anexoUrl ? (input.anexoNome ?? null) : null;
    } else if (input.anexoNome !== undefined) {
      data.anexoNome = input.anexoNome;
    }

    const publicandoAgora =
      input.status === 'PUBLICADO' && noticia.status !== 'PUBLICADO';

    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === 'PUBLICADO' && !noticia.publicadoEm) {
        data.publicadoEm = new Date();
      }
    }

    const atualizada = await this.prisma.noticia.update({ where: { id }, data });
    this.invalidarCacheListagem(noticia.tenantId);

    if (publicandoAgora) {
      void this.pushService.notificarNovaNoticia(atualizada);
    }

    return atualizada;
  }

  async remover(id: string): Promise<void> {
    try {
      const removida = await this.prisma.noticia.delete({ where: { id } });
      this.invalidarCacheListagem(removida.tenantId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Notícia não encontrada');
      }
      throw error;
    }
  }

  async listarAdmin() {
    const tenantId = requireTenantId();
    const chave = `${tenantId}:admin`;
    const cached = this.cacheListagem.get(chave);
    if (cached && cached.expires > Date.now()) {
      return cached.payload.items;
    }

    const itens = await this.prisma.noticia.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: CAMPOS_LISTAGEM_ADMIN,
      take: 100,
    });

    const items = itens.map((item) => ({
      ...item,
      capaUrl: null,
      resumo: '',
      autorId: '',
      updatedAt: item.createdAt,
    }));

    this.cacheListagem.set(chave, {
      expires: Date.now() + this.cacheTtlMs,
      payload: { items, total: items.length, page: 1, totalPages: 1 },
    });
    return items;
  }

  async buscarAdmin(id: string) {
    const noticia = await this.prisma.noticia.findUnique({ where: { id } });
    if (!noticia) {
      throw new NotFoundException('Notícia não encontrada');
    }
    return noticia;
  }

  async listarPublicadas({ page, limit }: ListarNoticiasQuery) {
    const tenantId = requireTenantId();
    const chave = this.chaveCache(tenantId, page, limit);
    const cached = this.cacheListagem.get(chave);
    if (cached && cached.expires > Date.now()) {
      return cached.payload;
    }

    const where = { tenantId, status: 'PUBLICADO' as const };

    // Promise.all evita round-trip sequencial do $transaction no pool remoto.
    const [items, total] = await Promise.all([
      this.prisma.noticia.findMany({
        where,
        orderBy: { publicadoEm: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: CAMPOS_LISTAGEM_PUBLICA,
      }),
      this.prisma.noticia.count({ where }),
    ]);

    const payload = {
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };

    this.cacheListagem.set(chave, {
      expires: Date.now() + this.cacheTtlMs,
      payload,
    });

    return payload;
  }

  async buscarPublicadaPorSlug(slug: string) {
    const tenantId = requireTenantId();
    const noticia = await this.prisma.noticia.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });
    if (!noticia || noticia.status !== 'PUBLICADO') {
      throw new NotFoundException('Notícia não encontrada');
    }
    return noticia;
  }

  /**
   * Uma única consulta traz a família de slugs; o sufixo livre é achado em
   * memória. Antes era um findUnique por tentativa, sem limite de iterações.
   */
  private async slugDisponivel(slugBase: string, ignorarId?: string): Promise<string> {
    const tenantId = requireTenantId();
    const base = slugBase || 'noticia';

    const ocupados = await this.prisma.noticia.findMany({
      where: {
        tenantId,
        slug: { startsWith: base },
        ...(ignorarId ? { id: { not: ignorarId } } : {}),
      },
      select: { slug: true },
    });

    const usados = new Set(ocupados.map((noticia) => noticia.slug));
    if (!usados.has(base)) {
      return base;
    }
    for (let sufixo = 2; ; sufixo++) {
      const candidato = `${base}-${sufixo}`;
      if (!usados.has(candidato)) {
        return candidato;
      }
    }
  }
}
