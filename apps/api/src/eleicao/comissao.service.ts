import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AdicionarMembroComissaoInput,
  AdministradorResumo,
  MembroComissao,
} from '@sindprf/types';
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

  /** Candidatos a membro da comissão — o front escolhe por e-mail, não por ID. */
  async listarAdministradores(): Promise<AdministradorResumo[]> {
    return this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
    });
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
    try {
      await this.prisma.membroComissaoEleitoral.delete({
        where: { eleicaoId_userId: { eleicaoId, userId } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Membro não encontrado nesta comissão');
      }
      throw error;
    }
  }
}
