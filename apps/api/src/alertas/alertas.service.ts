import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AtualizarAlertaInput, CriarAlertaInput } from '@sindprf/types';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../common/request-user';
import { requireTenantId } from '../tenant/tenant-context';

/** O popup só precisa do conteúdo; campos de gestão ficam no admin. */
const CAMPOS_PUBLICOS = {
  id: true,
  titulo: true,
  mensagem: true,
  imagemUrl: true,
  linkUrl: true,
  linkTexto: true,
} as const;

@Injectable()
export class AlertasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Alertas que o visitante atual pode ver agora.
   *
   * O recorte por público é feito aqui, no servidor: um alerta restrito nunca
   * chega ao navegador de quem não é filiado aprovado, mesmo que o front tenha
   * bug. Visitante anônimo custa uma única consulta.
   */
  async listarVisiveis(user: RequestUser | undefined) {
    const agora = new Date();
    const janela = {
      ativo: true,
      inicioEm: { lte: agora },
      fimEm: { gte: agora },
    } satisfies Prisma.AlertaWhereInput;

    if (!user || user.role !== 'AFILIADO') {
      return this.prisma.alerta.findMany({
        where: { ...janela, publico: 'TODOS' },
        select: CAMPOS_PUBLICOS,
        orderBy: { inicioEm: 'desc' },
      });
    }

    const [alertas, afiliado] = await Promise.all([
      this.prisma.alerta.findMany({
        where: janela,
        select: { ...CAMPOS_PUBLICOS, publico: true },
        orderBy: { inicioEm: 'desc' },
      }),
      this.prisma.afiliado.findUnique({
        where: { userId: user.id },
        select: { status: true },
      }),
    ]);

    const aprovado = afiliado?.status === 'APROVADO';
    return alertas
      .filter((alerta) => alerta.publico === 'TODOS' || aprovado)
      .map(({ publico: _publico, ...alerta }) => alerta);
  }

  listarAdmin() {
    const tenantId = requireTenantId();
    return this.prisma.alerta.findMany({
      where: { tenantId },
      orderBy: [{ inicioEm: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  async buscarAdmin(id: string) {
    const alerta = await this.prisma.alerta.findFirst({ where: { id } });
    if (!alerta) {
      throw new NotFoundException('Alerta não encontrado');
    }
    return alerta;
  }

  criar(input: CriarAlertaInput) {
    return this.prisma.alerta.create({
      data: {
        tenantId: requireTenantId(),
        titulo: input.titulo,
        mensagem: input.mensagem,
        imagemUrl: input.imagemUrl ?? null,
        linkUrl: input.linkUrl ?? null,
        linkTexto: input.linkTexto ?? null,
        publico: input.publico,
        ativo: input.ativo,
        inicioEm: input.inicioEm,
        fimEm: input.fimEm,
      },
    });
  }

  // A extension de tenant não intercepta update/delete singulares, então o
  // tenantId entra no where à mão — sem ele, um id vazado atravessaria sindicatos.
  async atualizar(id: string, input: AtualizarAlertaInput) {
    const tenantId = requireTenantId();
    try {
      return await this.prisma.alerta.update({ where: { id, tenantId }, data: input });
    } catch (error) {
      throw this.traduzirAusencia(error);
    }
  }

  async remover(id: string) {
    const tenantId = requireTenantId();
    try {
      await this.prisma.alerta.delete({ where: { id, tenantId } });
      return { ok: true };
    } catch (error) {
      throw this.traduzirAusencia(error);
    }
  }

  /** Evita um SELECT extra só para descobrir que o registro não existe. */
  private traduzirAusencia(error: unknown): unknown {
    const ausente =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
    return ausente ? new NotFoundException('Alerta não encontrado') : error;
  }
}
