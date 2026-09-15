import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarRecursoDiretoriaInput,
  CriarRecursoDiretoriaInput,
} from '@sindprf/types';
import type { RequestUser } from '../common/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';

@Injectable()
export class DiretoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async listarAdmin() {
    const tenantId = requireTenantId();
    return this.prisma.recursoDiretoria.findMany({
      where: { tenantId },
      orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async listarParaDiretor(user: RequestUser) {
    const afiliado = await this.prisma.afiliado.findUnique({
      where: { userId: user.id },
      select: { status: true, diretor: true },
    });
    if (!afiliado || afiliado.status !== 'APROVADO' || !afiliado.diretor) {
      throw new ForbiddenException('Acesso restrito à diretoria');
    }

    const tenantId = requireTenantId();
    return this.prisma.recursoDiretoria.findMany({
      where: { tenantId, ativo: true },
      orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async criar(input: CriarRecursoDiretoriaInput) {
    return this.prisma.recursoDiretoria.create({
      data: {
        tenantId: requireTenantId(),
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        url: input.url,
        ordem: input.ordem ?? 0,
        ativo: input.ativo ?? true,
      },
    });
  }

  async atualizar(id: string, input: AtualizarRecursoDiretoriaInput) {
    const tenantId = requireTenantId();
    const existente = await this.prisma.recursoDiretoria.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existente) {
      throw new NotFoundException('Recurso não encontrado');
    }

    const data: Prisma.RecursoDiretoriaUpdateInput = {};
    if (input.titulo !== undefined) data.titulo = input.titulo;
    if (input.descricao !== undefined) data.descricao = input.descricao;
    if (input.url !== undefined) data.url = input.url;
    if (input.ordem !== undefined) data.ordem = input.ordem;
    if (input.ativo !== undefined) data.ativo = input.ativo;

    return this.prisma.recursoDiretoria.update({
      where: { id },
      data,
    });
  }

  async remover(id: string) {
    const tenantId = requireTenantId();
    const existente = await this.prisma.recursoDiretoria.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existente) {
      throw new NotFoundException('Recurso não encontrado');
    }
    await this.prisma.recursoDiretoria.delete({ where: { id } });
    return { ok: true };
  }
}
