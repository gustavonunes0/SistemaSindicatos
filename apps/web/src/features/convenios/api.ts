import {
  convenioListagemSchema,
  convenioSchema,
  type AtualizarConvenioInput,
  type Convenio,
  type ConvenioListagem,
  type CriarConvenioInput,
  type EmitirDeclaracaoInput,
  type FiltroConveniosInput,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

export async function listarConvenios(filtro: FiltroConveniosInput): Promise<ConvenioListagem[]> {
  const { data } = await api.get('/convenios', { params: filtro });
  return z.array(convenioListagemSchema).parse(data);
}

export async function buscarConvenio(id: string): Promise<Convenio> {
  const { data } = await api.get(`/convenios/${id}`);
  return convenioSchema.parse(data);
}

export async function listarCategorias(): Promise<string[]> {
  const { data } = await api.get('/convenios/categorias');
  return z.array(z.string()).parse(data);
}

export async function listarConveniosAdmin(): Promise<ConvenioListagem[]> {
  const { data } = await api.get('/convenios/admin');
  return z.array(convenioListagemSchema).parse(data);
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

export async function emitirDeclaracao(
  id: string,
  input: EmitirDeclaracaoInput,
): Promise<void> {
  const resposta = await api.post(`/convenios/${id}/declaracao`, input, {
    responseType: 'blob',
  });

  const disposition = String(resposta.headers['content-disposition'] ?? '');
  const nomeMatch = /filename="([^"]+)"/i.exec(disposition);
  const nomeArquivo = nomeMatch?.[1] ?? `declaracao-${id}.pdf`;

  const blob =
    resposta.data instanceof Blob
      ? resposta.data
      : new Blob([resposta.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
