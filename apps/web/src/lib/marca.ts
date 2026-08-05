import type { TenantBranding } from '@sindprf/types';
import { tenantBrandingSchema } from '@sindprf/types';
import { useTenantStore } from '../features/tenant/store';

/** Fallback local (dev / branding ausente). */
export const marcaFallback: TenantBranding = {
  nome: 'SINDPRF-CE',
  nomeCompleto: 'Sindicato dos Policiais Rodoviários Federais no Estado do Ceará',
  logoUrl: '/logo-sindicato.png',
  sede: {
    endereco: 'Rua Margarida de Queiroz, 07 — Cajazeiras — Fortaleza/CE',
    cep: '60.864-300',
  },
  contato: {
    telefones: ['(85) 3279-2848', '(85) 3279-5698', '(85) 3279-7852'],
    email: 'sindprfce@sindprfce.com.br',
  },
  reservaApartamentosUrl: 'https://abre.ai/sindprfcereserva',
  regulamentoApartamentosUrl: '/imoveis/regulamento-apartamentos.pdf',
  themeColor: '#0b3d6b',
};

/** @deprecated Use useMarca() — mantido para imports legados. */
export const marca = marcaFallback;

export function telefonePrincipalTel(branding: TenantBranding = marcaFallback): string {
  const tel = branding.contato.telefones[0];
  if (!tel) return '';
  return `+55${tel.replace(/\D/g, '')}`;
}

export function useMarca(): TenantBranding {
  const branding = useTenantStore((s) => s.tenant?.branding);
  const parsed = tenantBrandingSchema.safeParse(branding);
  return parsed.success ? parsed.data : marcaFallback;
}

export function resolverMarca(): TenantBranding {
  const branding = useTenantStore.getState().tenant?.branding;
  const parsed = tenantBrandingSchema.safeParse(branding);
  return parsed.success ? parsed.data : marcaFallback;
}
