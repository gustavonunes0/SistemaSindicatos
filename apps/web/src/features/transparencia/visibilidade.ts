import type { TenantBranding } from '@sindprf/types';

/** Ausente no branding = liberado (comportamento histórico). */
export function transparenciaFinanceiraAtiva(marca: TenantBranding): boolean {
  return marca.transparenciaFinanceira !== false;
}
