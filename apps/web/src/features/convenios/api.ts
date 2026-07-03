import {
  convenioSchema,
  type AtualizarConvenioInput,
  type Convenio,
  type CriarConvenioInput,
  type FiltroConveniosInput,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

export async function listarConvenios(filtro: FiltroConveniosInput): Promise<Convenio[]> {
  const { data } = await api.get('/convenios', { params: filtro });
  return z.array(convenioSchema).parse(data);
}

export async function buscarConvenio(id: string): Promise<Convenio> {
  const { data } = await api.get(`/convenios/${id}`);
  return convenioSchema.parse(data);
}

export async function listarCategorias(): Promise<string[]> {
  const { data } = await api.get('/convenios/categorias');
  return z.array(z.string()).parse(data);
}

export async function listarConveniosAdmin(): Promise<Convenio[]> {
  const { data } = await api.get('/convenios/admin');
  return z.array(convenioSchema).parse(data);
}

export async function buscarConvenioAdmin(id: string): Promise<Convenio> {
  const { data } = await api.get(`/convenios/admin/${id}`);
  return convenioSchema.parse(data);
}

export async function criarConvenio(input: CriarConvenioInput): Promise<Convenio> {
  const { data } = await api.post('/convenios', input);
  return convenioSchema.parse(data);
}

export async function atualizarConvenio(
  id: string,
  input: AtualizarConvenioInput,
): Promise<Convenio> {
  const { data } = await api.patch(`/convenios/${id}`, input);
  return convenioSchema.parse(data);
}

export async function removerConvenio(id: string): Promise<void> {
  await api.delete(`/convenios/${id}`);
}
