import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarFormularioInput,
  CriarFormularioInput,
  FormularioPublico,
} from '@sindprf/types';
import type { RequestUser } from '../common/request-user';
import { gerarSlug } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenant/tenant-context';
import { lerCampos } from './campos';

/** Listagem do admin: a tabela não precisa carregar as perguntas. */
const CAMPOS_LISTAGEM_ADMIN = {
  id: true,
  titulo: true,
  slug: true,
  descricao: true,
  publico: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class FormulariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listarAdmin() {
    const formularios = await this.prisma.formulario.findMany({
      select: {
        ...CAMPOS_LISTAGEM_ADMIN,
        campos: true,
        _count: { select: { respostas: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return formularios.map(({ _count, campos, ...formulario }) => ({
      ...formulario,
      totalRespostas: _count.respostas,
      totalCampos: lerCampos(campos).length,
    }));
  }

  async buscarAdmin(id: string) {
    const formulario = await this.prisma.formulario.findFirst({ where: { id } });
    if (!formulario) {
      throw new NotFoundException('Formulário não encontrado');
    }
    return { ...formulario, campos: lerCampos(formulario.campos) };
  }

  async criar(input: CriarFormularioInput) {
    const formulario = await this.prisma.formulario.create({
      data: {
        tenantId: requireTenantId(),
        titulo: input.titulo,
        slug: await this.slugDisponivel(gerarSlug(input.titulo)),
        descricao: input.descricao ?? null,
        campos: input.campos as unknown as Prisma.InputJsonValue,
        publico: input.publico,
        status: input.status,
      },
    });
    return { ...formulario, campos: lerCampos(formulario.campos) };
  }

  async atualizar(id: string, input: AtualizarFormularioInput) {
    const tenantId = requireTenantId();
    const data: Prisma.FormularioUpdateInput = {};

    if (input.titulo !== undefined) {
      data.titulo = input.titulo;
      data.slug = await this.slugDisponivel(gerarSlug(input.titulo), id);
    }
    if (input.descricao !== undefined) {
      data.descricao = input.descricao;
    }
    if (input.campos !== undefined) {
      data.campos = input.campos as unknown as Prisma.InputJsonValue;
    }
    if (input.publico !== undefined) {
      data.publico = input.publico;
    }
    if (input.status !== undefined) {
      data.status = input.status;
    }

    try {
      const formulario = await this.prisma.formulario.update({
        where: { id, tenantId },
        data,
      });
      return { ...formulario, campos: lerCampos(formulario.campos) };
    } catch (error) {
      throw this.traduzirAusencia(error);
    }
  }

  async remover(id: string) {
    const tenantId = requireTenantId();
    try {
      await this.prisma.formulario.delete({ where: { id, tenantId } });
      return { ok: true };
    } catch (error) {
      throw this.traduzirAusencia(error);
    }
  }

  /**
   * Formulário como a página pública o enxerga.
   *
   * As perguntas só acompanham a resposta quando a pessoa realmente pode
   * responder: um formulário restrito a filiados não revela seu conteúdo a
   * quem está deslogado. O `motivo` existe para a tela explicar o bloqueio em
   * vez de apenas sumir com o conteúdo.
   */
  async buscarPublico(
    slug: string,
    user: RequestUser | undefined,
  ): Promise<FormularioPublico> {
    const [formulario, afiliado] = await Promise.all([
      this.prisma.formulario.findFirst({
        where: { slug, status: { in: ['PUBLICADO', 'ENCERRADO'] } },
        select: {
          id: true,
          titulo: true,
          slug: true,
          descricao: true,
          campos: true,
          publico: true,
          status: true,
        },
      }),
      user?.role === 'AFILIADO'
        ? this.prisma.afiliado.findUnique({
            where: { userId: user.id },
            select: { id: true, status: true },
          })
        : null,
    ]);

    if (!formulario) {
      throw new NotFoundException('Formulário não encontrado');
    }

    const aprovado = afiliado?.status === 'APROVADO';
    const jaRespondeu =
      aprovado && afiliado
        ? (await this.prisma.respostaFormulario.count({
            where: { formularioId: formulario.id, afiliadoId: afiliado.id },
          })) > 0
        : false;

    const motivo = this.motivoDeBloqueio({
      status: formulario.status,
      restrito: formulario.publico === 'FILIADOS',
      logadoComoAfiliado: Boolean(afiliado),
      aprovado,
      jaRespondeu,
    });
    const podeResponder = motivo === 'OK';

    return {
      titulo: formulario.titulo,
      slug: formulario.slug,
      descricao: formulario.descricao,
      publico: formulario.publico,
      status: formulario.status,
      // Já respondeu ainda vê as perguntas; quem está barrado por acesso, não.
      campos:
        podeResponder || motivo === 'JA_RESPONDEU' || motivo === 'ENCERRADO'
          ? lerCampos(formulario.campos)
          : [],
      podeResponder,
      jaRespondeu,
      motivo,
    };
  }

  private motivoDeBloqueio(contexto: {
    status: 'RASCUNHO' | 'PUBLICADO' | 'ENCERRADO';
    restrito: boolean;
    logadoComoAfiliado: boolean;
    aprovado: boolean;
    jaRespondeu: boolean;
  }): FormularioPublico['motivo'] {
    if (contexto.status === 'ENCERRADO') {
      return 'ENCERRADO';
    }
    if (contexto.restrito) {
      if (!contexto.logadoComoAfiliado) {
        return 'PRECISA_LOGIN';
      }
      if (!contexto.aprovado) {
        return 'PRECISA_APROVACAO';
      }
    }
    if (contexto.jaRespondeu) {
      return 'JA_RESPONDEU';
    }
    return 'OK';
  }

  /** Formulários publicados que o filiado atual pode responder. */
  async listarParaAfiliado(user: RequestUser) {
    const [formularios, afiliado] = await Promise.all([
      this.prisma.formulario.findMany({
        where: { status: 'PUBLICADO' },
        select: { ...CAMPOS_LISTAGEM_ADMIN, campos: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.afiliado.findUnique({
        where: { userId: user.id },
        select: { id: true, status: true },
      }),
    ]);

    if (!afiliado || afiliado.status !== 'APROVADO') {
      return [];
    }

    const respondidos = await this.prisma.respostaFormulario.findMany({
      where: { afiliadoId: afiliado.id, formularioId: { in: formularios.map((f) => f.id) } },
      select: { formularioId: true },
    });
    const jaRespondidos = new Set(respondidos.map((resposta) => resposta.formularioId));

    return formularios.map(({ campos, ...formulario }) => ({
      ...formulario,
      totalCampos: lerCampos(campos).length,
      jaRespondeu: jaRespondidos.has(formulario.id),
    }));
  }

  private async slugDisponivel(slugBase: string, ignorarId?: string): Promise<string> {
    const tenantId = requireTenantId();
    const base = slugBase || 'formulario';

    const ocupados = await this.prisma.formulario.findMany({
      where: {
        tenantId,
        slug: { startsWith: base },
        ...(ignorarId ? { id: { not: ignorarId } } : {}),
      },
      select: { slug: true },
    });

    const usados = new Set(ocupados.map((formulario) => formulario.slug));
    if (!usados.has(base)) {
      return base;
    }
    for (let sufixo = 2; ; sufixo++) {
      const candidato = `${base}-${sufixo}`;
      if (!usados.has(candidato)) {
        return candidato;
      }
    }
  }

  /** Evita um SELECT extra só para descobrir que o registro não existe. */
  private traduzirAusencia(error: unknown): unknown {
    const ausente =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
    return ausente ? new NotFoundException('Formulário não encontrado') : error;
  }
}
