import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarNoticiaInput,
  CriarNoticiaInput,
  ListarNoticiasQuery,
} from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { gerarSlug } from './slug';

@Injectable()
export class NoticiasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(autorId: string, input: CriarNoticiaInput) {
    return this.prisma.noticia.create({
      data: {
        titulo: input.titulo,
        slug: await this.slugDisponivel(gerarSlug(input.titulo)),
        conteudo: input.conteudo,
        capaUrl: input.capaUrl ?? null,
        status: input.status,
        publicadoEm: input.status === 'PUBLICADO' ? new Date() : null,
        autorId,
      },
    });
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
    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === 'PUBLICADO' && !noticia.publicadoEm) {
        data.publicadoEm = new Date();
      }
    }

    return this.prisma.noticia.update({ where: { id }, data });
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

  listarAdmin() {
    return this.prisma.noticia.findMany({ orderBy: { createdAt: 'desc' } });
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
      }),
      this.prisma.noticia.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async buscarPublicadaPorSlug(slug: string) {
    const noticia = await this.prisma.noticia.findUnique({ where: { slug } });
    if (!noticia || noticia.status !== 'PUBLICADO') {
      throw new NotFoundException('Notícia não encontrada');
    }
    return noticia;
  }

  private async slugDisponivel(slugBase: string, ignorarId?: string): Promise<string> {
    let slug = slugBase || 'noticia';
    for (let sufixo = 2; ; sufixo++) {
      const existente = await this.prisma.noticia.findUnique({ where: { slug } });
      if (!existente || existente.id === ignorarId) {
        return slug;
      }
      slug = `${slugBase}-${sufixo}`;
    }
  }
}
