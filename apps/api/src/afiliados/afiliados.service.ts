import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CadastroAfiliadoInput,
  DirecaoOrdenacao,
  FiltroAfiliadosInput,
  OrdenacaoAfiliado,
  StatusAfiliado,
} from '@sindprf/types';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';

const BCRYPT_ROUNDS = 10;

type ListaCache = { expires: number; payload: unknown };
type TotalCache = { expires: number; total: number };

/** O `id` no fim mantém a paginação estável quando há valores repetidos na coluna. */
function montarOrderBy(
  ordenar: OrdenacaoAfiliado,
  direcao: DirecaoOrdenacao,
): Prisma.AfiliadoOrderByWithRelationInput[] {
  const principal: Prisma.AfiliadoOrderByWithRelationInput =
    ordenar === 'matricula'
      ? { matricula: direcao }
      : ordenar === 'status'
        ? { status: direcao }
        : ordenar === 'createdAt'
          ? { createdAt: direcao }
          : { nome: direcao };
  return [principal, { id: 'asc' }];
}

@Injectable()
export class AfiliadosService {
  private readonly cacheLista = new Map<string, ListaCache>();
  private readonly cacheTotal = new Map<string, TotalCache>();
  private readonly cacheTtlMs = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  private invalidarCacheLista(tenantId = requireTenantId()) {
    for (const chave of this.cacheLista.keys()) {
      if (chave.startsWith(`${tenantId}:`)) {
        this.cacheLista.delete(chave);
      }
    }
    for (const chave of this.cacheTotal.keys()) {
      if (chave.startsWith(`${tenantId}:`)) {
        this.cacheTotal.delete(chave);
      }
    }
  }

  async cadastrar(input: CadastroAfiliadoInput) {
    const senhaHash = await bcrypt.hash(input.senha, BCRYPT_ROUNDS);
    const tenantId = requireTenantId();

    try {
      // Afiliado guarda a FK de User, então o create precisa ser encadeado.
      const criado = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { tenantId, email: input.email, senhaHash, role: 'AFILIADO' },
        });
        return tx.afiliado.create({
          data: {
            tenantId,
            userId: user.id,
            nome: input.nome,
            cpf: input.cpf,
            matricula: input.matricula,
            telefone: input.telefone ?? null,
            status: 'PENDENTE',
          },
        });
      });
      this.invalidarCacheLista(tenantId);
      return criado;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email, CPF ou matrícula já cadastrado');
      }
      throw error;
    }
  }

  async listar(filtro: FiltroAfiliadosInput) {
    const tenantId = requireTenantId();
    const { status, busca, page, limit, ordenar, direcao } = filtro;
    const termo = busca?.trim() ?? '';
    const chave = `${tenantId}:${status ?? ''}:${termo}:${page}:${limit}:${ordenar}:${direcao}`;
    const cached = this.cacheLista.get(chave);
    if (cached && cached.expires > Date.now()) {
      return cached.payload;
    }

    const cpfDigitos = termo.replace(/\D/g, '');

    const where: Prisma.AfiliadoWhereInput = {
      tenantId,
      ...(status ? { status } : {}),
      ...(termo
        ? {
            OR: [
              { nome: { contains: termo, mode: 'insensitive' } },
              ...(cpfDigitos.length > 0 ? [{ cpf: { contains: cpfDigitos } }] : []),
            ],
          }
        : {}),
    };

    // O total não muda entre páginas do mesmo filtro: cachear evita repetir o
    // count a cada troca de página, que é a consulta mais cara da listagem.
    const chaveTotal = `${tenantId}:${status ?? ''}:${termo}`;
    const totalCache = this.cacheTotal.get(chaveTotal);
    const totalConhecido =
      totalCache && totalCache.expires > Date.now() ? totalCache.total : undefined;

    const [total, items] = await Promise.all([
      totalConhecido ?? this.prisma.afiliado.count({ where }),
      this.prisma.afiliado.findMany({
        where,
        select: {
          id: true,
          userId: true,
          nome: true,
          cpf: true,
          matricula: true,
          telefone: true,
          categoria: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { email: true } },
        },
        orderBy: montarOrderBy(ordenar, direcao),
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    if (totalConhecido === undefined) {
      this.cacheTotal.set(chaveTotal, { expires: Date.now() + this.cacheTtlMs, total });
    }

    const payload = {
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
    this.cacheLista.set(chave, { expires: Date.now() + this.cacheTtlMs, payload });
    return payload;
  }

  async atualizarStatus(id: string, status: StatusAfiliado) {
    try {
      const atualizado = await this.prisma.afiliado.update({ where: { id }, data: { status } });
      this.invalidarCacheLista(atualizado.tenantId);
      return atualizado;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Afiliado não encontrado');
      }
      throw error;
    }
  }

  async atualizarSenha(id: string, novaSenha: string): Promise<void> {
    const afiliado = await this.prisma.afiliado.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!afiliado) {
      throw new NotFoundException('Afiliado não encontrado');
    }

    const senhaHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: afiliado.userId },
        data: { senhaHash },
      }),
      // Derruba sessões ativas após troca de senha pelo admin.
      this.prisma.refreshToken.updateMany({
        where: { userId: afiliado.userId, revogado: false },
        data: { revogado: true },
      }),
    ]);
  }
}
