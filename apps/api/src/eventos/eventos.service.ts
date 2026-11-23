import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarEventoInput,
  CriarEventoInput,
  FiltroEventosInput,
} from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';
import { serializarEvento } from './eventos.util';

const includeFotos = { fotos: { orderBy: { ordem: 'asc' as const } } };

@Injectable()
export class EventosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(input: CriarEventoInput) {
    const evento = await this.prisma.evento.create({
      data: {
        tenantId: requireTenantId(),
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        local: input.local ?? null,
        dataEvento: input.dataEvento ?? null,
        ativo: input.ativo,
      },
      include: includeFotos,
    });
    return serializarEvento(evento);
  }

  async atualizar(id: string, input: AtualizarEventoInput) {
    try {
      const evento = await this.prisma.evento.update({
        where: { id },
        data: {
          ...(input.titulo !== undefined ? { titulo: input.titulo } : {}),
          ...(input.descricao !== undefined ? { descricao: input.descricao } : {}),
          ...(input.local !== undefined ? { local: input.local } : {}),
          ...(input.dataEvento !== undefined ? { dataEvento: input.dataEvento } : {}),
          ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
        },
        include: includeFotos,
      });
      return serializarEvento(evento);
    } catch (error) {
      throw this.tratarNaoEncontrado(error);
    }
  }

  async remover(id: string): Promise<void> {
    try {
      await this.prisma.evento.delete({ where: { id } });
    } catch (error) {
      throw this.tratarNaoEncontrado(error);
    }
  }

  listarAdmin() {
    return this.prisma.evento
      .findMany({
        include: includeFotos,
        orderBy: [{ dataEvento: 'desc' }, { createdAt: 'desc' }],
      })
      .then((lista) => lista.map(serializarEvento));
  }

  async buscarAdmin(id: string) {
    const evento = await this.prisma.evento.findUnique({
      where: { id },
      include: includeFotos,
    });
    if (!evento) throw new NotFoundException('Evento não encontrado');
    return serializarEvento(evento);
  }

  listarPublico({ busca }: FiltroEventosInput) {
    const where: Prisma.EventoWhereInput = { ativo: true };
    if (busca) {
      where.OR = [
        { titulo: { contains: busca, mode: 'insensitive' } },
        { descricao: { contains: busca, mode: 'insensitive' } },
        { local: { contains: busca, mode: 'insensitive' } },
      ];
    }
    return this.prisma.evento
      .findMany({
        where,
        include: includeFotos,
        orderBy: [{ dataEvento: 'desc' }, { createdAt: 'desc' }],
      })
      .then((lista) => lista.map(serializarEvento));
  }

  async buscarPublico(id: string) {
    const evento = await this.prisma.evento.findUnique({
      where: { id },
      include: includeFotos,
    });
    if (!evento || !evento.ativo) {
      throw new NotFoundException('Evento não encontrado');
    }
    return serializarEvento(evento);
  }

  async adicionarFotos(
    id: string,
    arquivos: Array<{ url: string; nomeOriginal: string }>,
  ) {
    const [, ordemBase] = await Promise.all([
      this.buscarAdmin(id),
      this.prisma.fotoEvento.count({ where: { eventoId: id } }),
    ]);
    const tenantId = requireTenantId();
    await this.prisma.fotoEvento.createMany({
      data: arquivos.map((arquivo, indice) => ({
        tenantId,
        eventoId: id,
        url: arquivo.url,
        nomeOriginal: arquivo.nomeOriginal,
        ordem: ordemBase + indice,
      })),
    });
    return this.buscarAdmin(id);
  }

  async removerFoto(eventoId: string, fotoId: string): Promise<void> {
    const { count } = await this.prisma.fotoEvento.deleteMany({
      where: { id: fotoId, eventoId },
    });
    if (count === 0) throw new NotFoundException('Foto não encontrada');
  }

  private tratarNaoEncontrado(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException('Evento não encontrado');
    }
    throw error;
  }
}
