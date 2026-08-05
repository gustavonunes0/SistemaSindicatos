import { tenantPublicSchema, type TenantPublic } from '@sindprf/types';
import { create } from 'zustand';
import { api } from '../../lib/http';

interface TenantState {
  tenant: TenantPublic | null;
  carregando: boolean;
  erro: string | null;
  carregar: () => Promise<void>;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenant: null,
  carregando: true,
  erro: null,
  carregar: async () => {
    set({ carregando: true, erro: null });
    try {
      const { data } = await api.get('/tenants/current');
      const tenant = tenantPublicSchema.parse(data);
      set({ tenant, carregando: false });
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
      set({ tenant: null, carregando: false, erro: mensagem });
    }
  },
}));
