import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ElegivelResumo, IncluirElegivelInput } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';

@Injectable()
export class ElegibilidadeService {
  constructor(private readonly prisma: PrismaService) {}

  async sincronizar(eleicaoId: string): Promise<{ incluidos: number }> {
    const [, aprovados] = await Promise.all([
      this.garantirEleicaoExiste(eleicaoId),
      this.prisma.afiliado.findMany({
        where: { status: 'APROVADO' },
        select: { id: true },
      }),
    ]);
    const tenantId = requireTenantId();
    const resultado = await this.prisma.elegivel.createMany({
      data: aprovados.map((afiliado) => ({ tenantId, eleicaoId, afiliadoId: afiliado.id })),
      skipDuplicates: true,
    });
    return { incluidos: resultado.count };
  }

  async listar(eleicaoId: string): Promise<ElegivelResumo[]> {
    const [, elegiveis, compareceram] = await Promise.all([
      this.garantirEleicaoExiste(eleicaoId),
      this.prisma.elegivel.findMany({
        where: { eleicaoId },
        include: { afiliado: { select: { nome: true, matricula: true } } },
        orderBy: { afiliado: { nome: 'asc' } },
      }),
      this.prisma.comparecimento.findMany({
        where: { eleicaoId },
        select: { afiliadoId: true },
      }),
    ]);
    const compareceramSet = new Set(compareceram.map((registro) => registro.afiliadoId));

    return elegiveis.map((elegivel) => ({
      afiliadoId: elegivel.afiliadoId,
      nome: elegivel.afiliado.nome,
      matricula: elegivel.afiliado.matricula,
      compareceu: compareceramSet.has(elegivel.afiliadoId),
    }));
  }

  async incluir(eleicaoId: string, input: IncluirElegivelInput): Promise<void> {
    const [, afiliado] = await Promise.all([
      this.garantirEleicaoExiste(eleicaoId),
      this.prisma.afiliado.findUnique({
        where: { id: input.afiliadoId },
        select: { id: true },
      }),
    ]);
    if (!afiliado) {
      throw new NotFoundException('Afiliado não encontrado');
    }
    try {
      await this.prisma.elegivel.create({
        data: { tenantId: requireTenantId(), eleicaoId, afiliadoId: input.afiliadoId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Afiliado já está na lista de elegíveis');
      }
      throw error;
    }
  }

  async remover(eleicaoId: string, afiliadoId: string): Promise<void> {
    try {
      await this.prisma.elegivel.delete({
        where: { eleicaoId_afiliadoId: { eleicaoId, afiliadoId } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Afiliado não está na lista de elegíveis');
      }
      throw error;
    }
  }

  private async garantirEleicaoExiste(eleicaoId: string): Promise<void> {
    const existe = await this.prisma.eleicao.findUnique({
      where: { id: eleicaoId },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException('Eleição não encontrada');
    }
  }
}
