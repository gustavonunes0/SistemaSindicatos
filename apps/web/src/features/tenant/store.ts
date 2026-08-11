import { tenantPublicSchema, type TenantPublic } from '@sindprf/types';
import { create } from 'zustand';
import { api } from '../../lib/http';

const CACHE_KEY = 'sindprf:tenant-cache';

function lerCache(): TenantPublic | null {
  if (typeof window === 'undefined') return null;
  try {
    const bruto = sessionStorage.getItem(CACHE_KEY);
    if (!bruto) return null;
    const parsed: unknown = JSON.parse(bruto);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('host' in parsed) ||
      !('tenant' in parsed)
    ) {
      return null;
    }
    const { host, tenant } = parsed as { host: string; tenant: unknown };
    if (host !== window.location.hostname.toLowerCase()) return null;
    return tenantPublicSchema.parse(tenant);
  } catch {
    return null;
  }
}

function gravarCache(tenant: TenantPublic) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ host: window.location.hostname.toLowerCase(), tenant }),
    );
  } catch {
    // sessionStorage indisponível — ignora.
  }
}

interface TenantState {
  tenant: TenantPublic | null;
  carregando: boolean;
  erro: string | null;
  carregar: () => Promise<void>;
}

const cacheInicial = lerCache();

export const useTenantStore = create<TenantState>((set) => ({
  tenant: cacheInicial,
  // Se já há cache, não bloqueia a UI; revalida em background.
  carregando: !cacheInicial,
  erro: null,
  carregar: async () => {
    const jaTemTenant = Boolean(useTenantStore.getState().tenant);
    if (!jaTemTenant) {
      set({ carregando: true, erro: null });
    }
    try {
      const { data } = await api.get('/tenants/current');
      const tenant = tenantPublicSchema.parse(data);
      gravarCache(tenant);
      set({ tenant, carregando: false, erro: null });
    } catch (error) {
      const axiosData =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string | string[] }; status?: number } })
              .response
          : undefined;
      const apiMsg = axiosData?.data?.message;
      const mensagem = Array.isArray(apiMsg)
        ? apiMsg.join(', ')
        : typeof apiMsg === 'string'
          ? apiMsg
          : error instanceof Error
            ? error.message
            : 'Falha ao carregar sindicato';

      // Com cache, mantém a UI; só mostra erro se não houver tenant.
      set((estado) =>
        estado.tenant
          ? { carregando: false, erro: null }
          : { tenant: null, carregando: false, erro: mensagem },
      );
    }
  },
}));
