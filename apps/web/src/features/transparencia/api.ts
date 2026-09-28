import {
  balanceteTransparenciaDetalheSchema,
  balanceteTransparenciaSchema,
  type BalanceteTransparencia,
  type BalanceteTransparenciaDetalhe,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

export async function listarBalancetesTransparencia(): Promise<BalanceteTransparencia[]> {
  const { data } = await api.get('/balancetes/transparencia');
  return z.array(balanceteTransparenciaSchema).parse(data);
}

export async function detalheBalanceteTransparencia(
  id: string,
): Promise<BalanceteTransparenciaDetalhe> {
  const { data } = await api.get(`/balancetes/transparencia/${id}`);
  return balanceteTransparenciaDetalheSchema.parse(data);
}
