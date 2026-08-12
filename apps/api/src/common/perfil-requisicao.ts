import { AsyncLocalStorage } from 'node:async_hooks';

export interface PerfilRequisicao {
  /** Quantas operações Prisma a requisição disparou. */
  consultas: number;
  /** Soma do tempo gasto esperando o banco, em ms. */
  msBanco: number;
  /** Maior espera individual, para identificar a consulta problemática. */
  msMaiorConsulta: number;
  operacaoMaisLenta: string | null;
}

export const perfilAls = new AsyncLocalStorage<PerfilRequisicao>();

export function novoPerfil(): PerfilRequisicao {
  return { consultas: 0, msBanco: 0, msMaiorConsulta: 0, operacaoMaisLenta: null };
}

export function registrarConsulta(operacao: string, ms: number): void {
  const perfil = perfilAls.getStore();
  if (!perfil) {
    return;
  }
  perfil.consultas += 1;
  perfil.msBanco += ms;
  if (ms > perfil.msMaiorConsulta) {
    perfil.msMaiorConsulta = ms;
    perfil.operacaoMaisLenta = operacao;
  }
}

/**
 * Requisições acima deste tempo total viram log. Ajustável por env para
 * investigar sem inundar o log em produção.
 */
export function limiteLogMs(): number {
  const bruto = Number(process.env.PERF_LOG_MS);
  return Number.isFinite(bruto) && bruto > 0 ? bruto : 700;
}
