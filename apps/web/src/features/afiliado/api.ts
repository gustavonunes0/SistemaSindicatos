import { afiliadoSchema, type CadastroAfiliadoInput, type StatusAfiliado } from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

const afiliadoAdminSchema = afiliadoSchema.extend({
  user: z.object({ email: z.string() }),
});

export type AfiliadoAdmin = z.infer<typeof afiliadoAdminSchema>;

export async function cadastrarAfiliado(input: CadastroAfiliadoInput) {
  const { data } = await api.post('/afiliados/cadastro', input);
  return afiliadoSchema.parse(data);
}

export async function listarAfiliadosAdmin(status?: StatusAfiliado) {
  const { data } = await api.get('/afiliados', { params: status ? { status } : undefined });
  return z.array(afiliadoAdminSchema).parse(data);
}

export async function atualizarStatusAfiliado(id: string, status: StatusAfiliado) {
  const { data } = await api.patch(`/afiliados/${id}/status`, { status });
  return afiliadoSchema.parse(data);
}
