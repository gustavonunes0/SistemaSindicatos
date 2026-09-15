import {
  recursoDiretoriaSchema,
  type AtualizarRecursoDiretoriaInput,
  type CriarRecursoDiretoriaInput,
  type RecursoDiretoria,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

export async function listarRecursosDiretoriaAdmin(): Promise<RecursoDiretoria[]> {
  const { data } = await api.get('/diretoria/recursos');
  return z.array(recursoDiretoriaSchema).parse(data);
}

export async function listarRecursosDiretoria(): Promise<RecursoDiretoria[]> {
  const { data } = await api.get('/diretoria/recursos/meus');
  return z.array(recursoDiretoriaSchema).parse(data);
}

export async function criarRecursoDiretoria(
  input: CriarRecursoDiretoriaInput,
): Promise<RecursoDiretoria> {
  const { data } = await api.post('/diretoria/recursos', input);
  return recursoDiretoriaSchema.parse(data);
}

export async function atualizarRecursoDiretoria(
  id: string,
  input: AtualizarRecursoDiretoriaInput,
): Promise<RecursoDiretoria> {
  const { data } = await api.patch(`/diretoria/recursos/${id}`, input);
  return recursoDiretoriaSchema.parse(data);
}

export async function removerRecursoDiretoria(id: string): Promise<void> {
  await api.delete(`/diretoria/recursos/${id}`);
}
