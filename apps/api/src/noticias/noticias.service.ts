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
import { gerarSlug } from './slug';

const CAMPOS_LISTAGEM = {
  id: true,
  titulo: true,
  slug: true,
  capaUrl: true,
  conteudo: true,
  status: true,
  publicadoEm: true,
  autorId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function paraListagem<T extends { conteudo: string }>(noticia: T) {
  const { conteudo, ...resto } = noticia;
  return { ...resto, resumo: resumoDeConteudo(conteudo) };
}

@Injectable()
export class NoticiasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  async criar(autorId: string, input: CriarNoticiaInput) {
    const noticia = await this.prisma.noticia.create({
      data: {
        tenantId: requireTenantId(),
        titulo: input.titulo,
        slug: await this.slugDisponivel(gerarSlug(input.titulo)),
        conteudo: input.conteudo,
        capaUrl: input.capaUrl ?? null,
        status: input.status,
        publicadoEm: input.status === 'PUBLICADO' ? new Date() : null,
        autorId,
      },
    });

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
    }
    if (input.capaUrl !== undefined) {
      data.capaUrl = input.capaUrl;
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

    if (publicandoAgora) {
      void this.pushService.notificarNovaNoticia(atualizada);
    }

    return atualizada;
  }

  async remover(id: string): Promise<void> {
    try {
      await this.prisma.noticia.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Notícia não encontrada');
      }
      throw error;
    }
  }

  async listarAdmin() {
    const itens = await this.prisma.noticia.findMany({
      orderBy: { createdAt: 'desc' },
      select: CAMPOS_LISTAGEM,
    });
    return itens.map(paraListagem);
  }

  async buscarAdmin(id: string) {
    const noticia = await this.prisma.noticia.findUnique({ where: { id } });
    if (!noticia) {
      throw new NotFoundException('Notícia não encontrada');
    }
    return noticia;
  }

  async listarPublicadas({ page, limit }: ListarNoticiasQuery) {
    const where = { status: 'PUBLICADO' } as const;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.noticia.findMany({
        where,
        orderBy: { publicadoEm: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: CAMPOS_LISTAGEM,
      }),
      this.prisma.noticia.count({ where }),
    ]);
    return {
      items: items.map(paraListagem),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
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

  private async slugDisponivel(slugBase: string, ignorarId?: string): Promise<string> {
    const tenantId = requireTenantId();
    let slug = slugBase || 'noticia';
    for (let sufixo = 2; ; sufixo++) {
      const existente = await this.prisma.noticia.findUnique({
        where: { tenantId_slug: { tenantId, slug } },
      });
      if (!existente || existente.id === ignorarId) {
        return slug;
      }
      slug = `${slugBase}-${sufixo}`;
    }
  }
}
