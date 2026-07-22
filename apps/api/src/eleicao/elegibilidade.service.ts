import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ElegivelResumo, IncluirElegivelInput } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ElegibilidadeService {
  constructor(private readonly prisma: PrismaService) {}

  async sincronizar(eleicaoId: string): Promise<{ incluidos: number }> {
    await this.garantirEleicaoExiste(eleicaoId);
    const aprovados = await this.prisma.afiliado.findMany({
      where: { status: 'APROVADO' },
      select: { id: true },
    });
    const resultado = await this.prisma.elegivel.createMany({
      data: aprovados.map((afiliado) => ({ eleicaoId, afiliadoId: afiliado.id })),
      skipDuplicates: true,
    });
    return { incluidos: resultado.count };
  }

  async listar(eleicaoId: string): Promise<ElegivelResumo[]> {
    await this.garantirEleicaoExiste(eleicaoId);
    const [elegiveis, compareceram] = await Promise.all([
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
    await this.garantirEleicaoExiste(eleicaoId);
    const afiliado = await this.prisma.afiliado.findUnique({ where: { id: input.afiliadoId } });
    if (!afiliado) {
      throw new NotFoundException('Afiliado não encontrado');
    }
    try {
      await this.prisma.elegivel.create({ data: { eleicaoId, afiliadoId: input.afiliadoId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Afiliado já está na lista de elegíveis');
      }
      throw error;
    }
  }

  async remover(eleicaoId: string, afiliadoId: string): Promise<void> {
    const elegivel = await this.prisma.elegivel.findUnique({
      where: { eleicaoId_afiliadoId: { eleicaoId, afiliadoId } },
    });
    if (!elegivel) {
      throw new NotFoundException('Afiliado não está na lista de elegíveis');
    }
    await this.prisma.elegivel.delete({ where: { id: elegivel.id } });
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
