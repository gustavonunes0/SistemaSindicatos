import type { ImoveisModo, TenantBranding } from '@sindprf/types';

/** Ausente no branding = reserva pelo sistema (regulamento atual). */
export function modoImoveis(branding: TenantBranding): ImoveisModo {
  if (branding.imoveisModo === 'LINK') return 'LINK';
  if (branding.imoveisModo === 'VITRINE') return 'VITRINE';
  return 'SISTEMA';
}

export function reservaPeloSistema(branding: TenantBranding): boolean {
  return modoImoveis(branding) === 'SISTEMA';
}

export function mostrarVitrine(branding: TenantBranding): boolean {
  const modo = modoImoveis(branding);
  return modo === 'VITRINE' || modo === 'SISTEMA';
}
