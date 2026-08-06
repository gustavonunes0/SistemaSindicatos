import { adminMetricasSchema, type AdminMetricas } from '@sindprf/types';
import { api } from '../../lib/http';

export async function buscarMetricasAdmin(): Promise<AdminMetricas> {
  const { data } = await api.get('/admin/metricas');
  return adminMetricasSchema.parse(data);
}
