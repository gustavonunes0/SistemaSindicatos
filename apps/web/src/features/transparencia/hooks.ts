import { useMutation, useQuery } from '@tanstack/react-query';
import type { DefinirTransparenciaFinanceiraInput } from '@sindprf/types';
import { useTenantStore } from '../tenant/store';
import * as transparenciaApi from './api';

export function useBalancetesTransparencia(enabled = true) {
  return useQuery({
    queryKey: ['transparencia', 'balancetes'],
    queryFn: () => transparenciaApi.listarBalancetesTransparencia(),
    enabled,
  });
}

export function useBalanceteTransparencia(id: string | undefined) {
  return useQuery({
    queryKey: ['transparencia', 'balancetes', id],
    queryFn: () => transparenciaApi.detalheBalanceteTransparencia(id!),
    enabled: Boolean(id),
  });
}

export function useDefinirTransparenciaFinanceira() {
  return useMutation({
    mutationFn: (input: DefinirTransparenciaFinanceiraInput) =>
      transparenciaApi.definirConfigTransparenciaFinanceira(input),
    onSuccess: () => {
      void useTenantStore.getState().carregar();
    },
  });
}
