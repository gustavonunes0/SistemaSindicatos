import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { criarPerfilExtension } from './perfil.extension';
import { criarTenantExtension } from './tenant.extension';

function criarClient() {
  return new PrismaClient().$extends(criarTenantExtension()).$extends(criarPerfilExtension());
}

export type TenantPrismaClient = ReturnType<typeof criarClient>;

/**
 * Prisma com extension de tenant. Proxy delega delegates/métodos ao client
 * estendido, mantendo lifecycle hooks do Nest.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: TenantPrismaClient = criarClient();

  constructor() {
    // eslint-disable-next-line no-constructor-return -- Nest + Prisma extensions
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop === 'onModuleInit' || prop === 'onModuleDestroy' || prop === 'client') {
          return Reflect.get(target, prop, receiver);
        }
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        const value = Reflect.get(target.client as object, prop);
        return typeof value === 'function'
          ? (value as (...args: unknown[]) => unknown).bind(target.client)
          : value;
      },
    }) as unknown as PrismaService;
  }

  // Tipagem estática dos delegates (runtime via Proxy).
  declare user: TenantPrismaClient['user'];
  declare afiliado: TenantPrismaClient['afiliado'];
  declare documentoAfiliado: TenantPrismaClient['documentoAfiliado'];
  declare dependenteAfiliado: TenantPrismaClient['dependenteAfiliado'];
  declare alerta: TenantPrismaClient['alerta'];
  declare formulario: TenantPrismaClient['formulario'];
  declare respostaFormulario: TenantPrismaClient['respostaFormulario'];
  declare refreshToken: TenantPrismaClient['refreshToken'];
  declare passwordResetToken: TenantPrismaClient['passwordResetToken'];
  declare importacaoD8: TenantPrismaClient['importacaoD8'];
  declare linhaD8: TenantPrismaClient['linhaD8'];
  declare noticia: TenantPrismaClient['noticia'];
  declare pushSubscription: TenantPrismaClient['pushSubscription'];
  declare instagramPost: TenantPrismaClient['instagramPost'];
  declare convenio: TenantPrismaClient['convenio'];
  declare declaracaoEmitida: TenantPrismaClient['declaracaoEmitida'];
  declare eleicao: TenantPrismaClient['eleicao'];
  declare membroComissaoEleitoral: TenantPrismaClient['membroComissaoEleitoral'];
  declare chapa: TenantPrismaClient['chapa'];
  declare contestacaoChapa: TenantPrismaClient['contestacaoChapa'];
  declare candidato: TenantPrismaClient['candidato'];
  declare elegivel: TenantPrismaClient['elegivel'];
  declare comparecimento: TenantPrismaClient['comparecimento'];
  declare voto: TenantPrismaClient['voto'];
  declare resultadoApuracao: TenantPrismaClient['resultadoApuracao'];
  declare imovel: TenantPrismaClient['imovel'];
  declare fotoImovel: TenantPrismaClient['fotoImovel'];
  declare periodo: TenantPrismaClient['periodo'];
  declare solicitacaoAluguel: TenantPrismaClient['solicitacaoAluguel'];
  declare mensagem: TenantPrismaClient['mensagem'];
  declare importacaoBalancete: TenantPrismaClient['importacaoBalancete'];
  declare linhaBalancete: TenantPrismaClient['linhaBalancete'];
  declare tenant: TenantPrismaClient['tenant'];
  declare tenantDomain: TenantPrismaClient['tenantDomain'];
  declare $transaction: TenantPrismaClient['$transaction'];
  declare $connect: TenantPrismaClient['$connect'];
  declare $disconnect: TenantPrismaClient['$disconnect'];
  declare $queryRaw: TenantPrismaClient['$queryRaw'];
  declare $executeRaw: TenantPrismaClient['$executeRaw'];

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
