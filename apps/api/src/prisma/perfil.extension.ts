import { Prisma } from '@prisma/client';
import { registrarConsulta } from '../common/perfil-requisicao';

/**
 * Cronometra cada operação Prisma dentro do contexto da requisição. Roda na
 * mesma cadeia async de quem chamou, então a atribuição por requisição é exata.
 */
export function criarPerfilExtension() {
  return Prisma.defineExtension({
    name: 'perfil',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const inicio = process.hrtime.bigint();
          try {
            return await query(args);
          } finally {
            const ms = Number(process.hrtime.bigint() - inicio) / 1_000_000;
            registrarConsulta(`${model}.${operation}`, ms);
          }
        },
      },
    },
  });
}
