import {
  afiliadoSchema,
  type AdminAtualizarSenhaAfiliadoInput,
  type FiltroAfiliadosInput,
  type StatusAfiliado,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

const afiliadoAdminSchema = afiliadoSchema.extend({
  user: z.object({ email: z.string() }),
});

export type AfiliadoAdmin = z.infer<typeof afiliadoAdminSchema>;

export const afiliadosAdminPaginadosSchema = z.object({
  items: z.array(afiliadoAdminSchema),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export type AfiliadosAdminPaginados = z.infer<typeof afiliadosAdminPaginadosSchema>;

export async function listarAfiliadosAdmin(
  filtro: Partial<FiltroAfiliadosInput> = {},
): Promise<AfiliadosAdminPaginados> {
  const params: Record<string, string | number> = {};
  if (filtro.status) params.status = filtro.status;
  if (filtro.busca?.trim()) params.busca = filtro.busca.trim();
  if (filtro.page) params.page = filtro.page;
  if (filtro.limit) params.limit = filtro.limit;

  const { data } = await api.get('/afiliados', { params });
  return afiliadosAdminPaginadosSchema.parse(data);
}

export async function atualizarStatusAfiliado(id: string, status: StatusAfiliado) {
  const { data } = await api.patch(`/afiliados/${id}/status`, { status });
  return afiliadoSchema.parse(data);
}

export async function atualizarSenhaAfiliadoAdmin(
  id: string,
  input: AdminAtualizarSenhaAfiliadoInput,
): Promise<void> {
  await api.patch(`/afiliados/${id}/senha`, input);
}
