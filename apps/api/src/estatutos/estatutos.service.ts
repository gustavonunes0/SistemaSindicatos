import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AtualizarEstatutoInput, CriarEstatutoInput } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { requireTenantId } from '../tenant/tenant-context';

const CAMPOS_PUBLICOS = {
  id: true,
  titulo: true,
  nomeOriginal: true,
  mimeType: true,
  tamanhoBytes: true,
  ativo: true,
  ordem: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class EstatutosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  listarAdmin() {
    const tenantId = requireTenantId();
    return this.prisma.estatuto.findMany({
      where: { tenantId },
      select: CAMPOS_PUBLICOS,
      orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }],
    });
  }

  listarParaAfiliado() {
    const tenantId = requireTenantId();
    return this.prisma.estatuto.findMany({
      where: { tenantId, ativo: true },
      select: CAMPOS_PUBLICOS,
      orderBy: [{ ordem: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async criar(input: CriarEstatutoInput, arquivo: Express.Multer.File) {
    const chave = await this.storage.salvarPrivado(arquivo.buffer, arquivo.originalname);
    return this.prisma.estatuto.create({
      data: {
        tenantId: requireTenantId(),
        titulo: input.titulo,
        arquivoChave: chave,
        nomeOriginal: arquivo.originalname.slice(0, 180),
        mimeType: arquivo.mimetype || 'application/pdf',
        tamanhoBytes: arquivo.size,
        ordem: input.ordem ?? 0,
        ativo: input.ativo ?? true,
      },
      select: CAMPOS_PUBLICOS,
    });
  }

  async atualizar(id: string, input: AtualizarEstatutoInput) {
    const tenantId = requireTenantId();
    const existente = await this.prisma.estatuto.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existente) {
      throw new NotFoundException('Estatuto não encontrado');
    }

    const data: Prisma.EstatutoUpdateInput = {};
    if (input.titulo !== undefined) data.titulo = input.titulo;
    if (input.ordem !== undefined) data.ordem = input.ordem;
    if (input.ativo !== undefined) data.ativo = input.ativo;

    return this.prisma.estatuto.update({
      where: { id },
      data,
      select: CAMPOS_PUBLICOS,
    });
  }

  async remover(id: string) {
    const tenantId = requireTenantId();
    const existente = await this.prisma.estatuto.findFirst({
      where: { id, tenantId },
      select: { id: true, arquivoChave: true },
    });
    if (!existente) {
      throw new NotFoundException('Estatuto não encontrado');
    }

    await this.prisma.estatuto.delete({ where: { id } });
    await this.storage.removerPrivado(existente.arquivoChave);
    return { ok: true };
  }

  async baixar(id: string, apenasAtivos: boolean) {
    const tenantId = requireTenantId();
    const estatuto = await this.prisma.estatuto.findFirst({
      where: {
        id,
        tenantId,
        ...(apenasAtivos ? { ativo: true } : {}),
      },
    });
    if (!estatuto) {
      throw new NotFoundException('Estatuto não encontrado');
    }

    try {
      const buffer = await this.storage.lerPrivado(estatuto.arquivoChave);
      return {
        buffer,
        mimeType: estatuto.mimeType,
        nomeOriginal: estatuto.nomeOriginal,
      };
    } catch {
      throw new BadRequestException('Arquivo do estatuto não está disponível');
    }
  }
}
