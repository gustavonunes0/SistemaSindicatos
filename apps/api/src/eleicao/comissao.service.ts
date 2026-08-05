import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdicionarMembroComissaoInput, MembroComissao } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';

@Injectable()
export class ComissaoService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(eleicaoId: string): Promise<MembroComissao[]> {
    const membros = await this.prisma.membroComissaoEleitoral.findMany({
      where: { eleicaoId },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return membros.map((membro) => ({
      userId: membro.userId,
      email: membro.user.email,
      titular: membro.titular,
    }));
  }

  async adicionar(eleicaoId: string, input: AdicionarMembroComissaoInput): Promise<MembroComissao> {
    const usuario = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!usuario || usuario.role !== 'ADMIN') {
      throw new NotFoundException('Usuário ADMIN não encontrado');
    }

    try {
      await this.prisma.membroComissaoEleitoral.create({
        data: {
          tenantId: requireTenantId(),
          eleicaoId,
          userId: input.userId,
          titular: input.titular,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Este usuário já é membro da comissão desta eleição');
      }
      throw error;
    }

    return { userId: usuario.id, email: usuario.email, titular: input.titular };
  }

  async remover(eleicaoId: string, userId: string): Promise<void> {
    const membro = await this.prisma.membroComissaoEleitoral.findUnique({
      where: { eleicaoId_userId: { eleicaoId, userId } },
    });
    if (!membro) {
      throw new NotFoundException('Membro não encontrado nesta comissão');
    }
    await this.prisma.membroComissaoEleitoral.delete({ where: { id: membro.id } });
  }
}
