import {
  balanceteTransparenciaDetalheSchema,
  balanceteTransparenciaSchema,
  transparenciaFinanceiraConfigSchema,
  type BalanceteTransparencia,
  type BalanceteTransparenciaDetalhe,
  type DefinirTransparenciaFinanceiraInput,
  type TransparenciaFinanceiraConfig,
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

export async function lerConfigTransparenciaFinanceira(): Promise<TransparenciaFinanceiraConfig> {
  const { data } = await api.get('/balancetes/transparencia/config');
  return transparenciaFinanceiraConfigSchema.parse(data);
}

export async function definirConfigTransparenciaFinanceira(
  input: DefinirTransparenciaFinanceiraInput,
): Promise<TransparenciaFinanceiraConfig> {
  const { data } = await api.put('/balancetes/transparencia/config', input);
  return transparenciaFinanceiraConfigSchema.parse(data);
}
