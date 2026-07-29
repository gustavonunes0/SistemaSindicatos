import {
  afiliadoSchema,
  type AdminAtualizarSenhaAfiliadoInput,
  type StatusAfiliado,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

const afiliadoAdminSchema = afiliadoSchema.extend({
  user: z.object({ email: z.string() }),
});

export type AfiliadoAdmin = z.infer<typeof afiliadoAdminSchema>;

export async function listarAfiliadosAdmin(status?: StatusAfiliado) {
  const { data } = await api.get('/afiliados', { params: status ? { status } : undefined });
  return z.array(afiliadoAdminSchema).parse(data);
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
