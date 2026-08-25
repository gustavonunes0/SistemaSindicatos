import { Prisma } from '@prisma/client';
import { getTenantContext } from '../tenant/tenant-context';

/** Models que possuem coluna tenantId (Fase A). */
const MODELS_COM_TENANT = new Set([
  'User',
  'RefreshToken',
  'PasswordResetToken',
  'Afiliado',
  'DocumentoAfiliado',
  'DependenteAfiliado',
  'Alerta',
  'Formulario',
  'RespostaFormulario',
  'ImportacaoD8',
  'LinhaD8',
  'Noticia',
  'PushSubscription',
  'InstagramPost',
  'Convenio',
  'DeclaracaoEmitida',
  'Eleicao',
  'MembroComissaoEleitoral',
  'Chapa',
  'ContestacaoChapa',
  'Candidato',
  'Elegivel',
  'Comparecimento',
  'Voto',
  'ResultadoApuracao',
  'Imovel',
  'FotoImovel',
  'Periodo',
  'SolicitacaoAluguel',
  'Mensagem',
  'ImportacaoBalancete',
  'LinhaBalancete',
]);

function tenantIdAtivo(): string | undefined {
  const ctx = getTenantContext();
  if (!ctx || ctx.bypass || !ctx.tenantId) {
    return undefined;
  }
  return ctx.tenantId;
}

function injetarWhere(args: { where?: Record<string, unknown> }, tenantId: string): void {
  args.where = { ...(args.where ?? {}), tenantId };
}

function injetarData(
  data: Record<string, unknown> | Record<string, unknown>[],
  tenantId: string,
): void {
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item.tenantId == null) {
        item.tenantId = tenantId;
      }
    }
    return;
  }
  if (data.tenantId == null) {
    data.tenantId = tenantId;
  }
}

/**
 * Extension Prisma: injeta tenantId em creates/listagens e bloqueia leitura
 * cross-tenant em findUnique/findFirst quando o registro tem tenantId.
 */
export function criarTenantExtension() {
  return Prisma.defineExtension({
    name: 'tenant',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          const tenantId = tenantIdAtivo();
          if (tenantId && MODELS_COM_TENANT.has(model)) {
            injetarWhere(args as { where?: Record<string, unknown> }, tenantId);
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          const tenantId = tenantIdAtivo();
          if (tenantId && MODELS_COM_TENANT.has(model)) {
            injetarWhere(args as { where?: Record<string, unknown> }, tenantId);
          }
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          const tenantId = tenantIdAtivo();
          if (tenantId && MODELS_COM_TENANT.has(model)) {
            injetarWhere(args as { where?: Record<string, unknown> }, tenantId);
          }
          return query(args);
        },
        async count({ model, args, query }) {
          const tenantId = tenantIdAtivo();
          if (tenantId && MODELS_COM_TENANT.has(model)) {
            injetarWhere(args as { where?: Record<string, unknown> }, tenantId);
          }
          return query(args);
        },
        async aggregate({ model, args, query }) {
          const tenantId = tenantIdAtivo();
          if (tenantId && MODELS_COM_TENANT.has(model)) {
            injetarWhere(args as { where?: Record<string, unknown> }, tenantId);
          }
          return query(args);
        },
        async create({ model, args, query }) {
          const tenantId = tenantIdAtivo();
          if (tenantId && MODELS_COM_TENANT.has(model)) {
            injetarData(args.data as Record<string, unknown>, tenantId);
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          const tenantId = tenantIdAtivo();
          if (tenantId && MODELS_COM_TENANT.has(model) && args.data) {
            injetarData(args.data as Record<string, unknown> | Record<string, unknown>[], tenantId);
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          const tenantId = tenantIdAtivo();
          if (tenantId && MODELS_COM_TENANT.has(model)) {
            injetarWhere(args as { where?: Record<string, unknown> }, tenantId);
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          const tenantId = tenantIdAtivo();
          if (tenantId && MODELS_COM_TENANT.has(model)) {
            injetarWhere(args as { where?: Record<string, unknown> }, tenantId);
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          const result = await query(args);
          const tenantId = tenantIdAtivo();
          if (
            result &&
            tenantId &&
            MODELS_COM_TENANT.has(model) &&
            typeof result === 'object' &&
            'tenantId' in result &&
            (result as { tenantId: string }).tenantId !== tenantId
          ) {
            return null;
          }
          return result;
        },
        async findUniqueOrThrow({ model, args, query }) {
          const result = await query(args);
          const tenantId = tenantIdAtivo();
          if (
            result &&
            tenantId &&
            MODELS_COM_TENANT.has(model) &&
            typeof result === 'object' &&
            'tenantId' in result &&
            (result as { tenantId: string }).tenantId !== tenantId
          ) {
            // Emula P2025
            const error = new Prisma.PrismaClientKnownRequestError('No record found', {
              code: 'P2025',
              clientVersion: Prisma.prismaVersion.client,
            });
            throw error;
          }
          return result;
        },
      },
    },
  });
}
