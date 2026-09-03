import type { ImoveisModo, TenantBranding } from '@sindprf/types';

/** Ausente no branding = vitrine (comportamento histórico). */
export function modoImoveis(branding: TenantBranding): ImoveisModo {
  return branding.imoveisModo === 'LINK' ? 'LINK' : 'VITRINE';
}
