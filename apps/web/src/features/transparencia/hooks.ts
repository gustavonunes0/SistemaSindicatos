import { useQuery } from '@tanstack/react-query';
import * as transparenciaApi from './api';

export function useBalancetesTransparencia() {
  return useQuery({
    queryKey: ['transparencia', 'balancetes'],
    queryFn: () => transparenciaApi.listarBalancetesTransparencia(),
  });
}

export function useBalanceteTransparencia(id: string | undefined) {
  return useQuery({
    queryKey: ['transparencia', 'balancetes', id],
    queryFn: () => transparenciaApi.detalheBalanceteTransparencia(id!),
    enabled: Boolean(id),
  });
}
