import { useQuery } from '@tanstack/react-query';
import * as adminApi from './api';

export function useAdminMetricas() {
  return useQuery({
    queryKey: ['admin', 'metricas'],
    queryFn: adminApi.buscarMetricasAdmin,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
