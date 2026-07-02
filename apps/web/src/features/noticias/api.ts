import {
  noticiaSchema,
  noticiasPaginadasSchema,
  uploadCapaResponseSchema,
  type AtualizarNoticiaInput,
  type CriarNoticiaInput,
  type Noticia,
  type NoticiasPaginadas,
  type UploadCapaResponse,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

export async function listarNoticias(page: number, limit: number): Promise<NoticiasPaginadas> {
  const { data } = await api.get('/noticias', { params: { page, limit } });
  return noticiasPaginadasSchema.parse(data);
}

export async function buscarNoticiaPorSlug(slug: string): Promise<Noticia> {
  const { data } = await api.get(`/noticias/${slug}`);
  return noticiaSchema.parse(data);
}

export async function listarNoticiasAdmin(): Promise<Noticia[]> {
  const { data } = await api.get('/noticias/admin');
  return z.array(noticiaSchema).parse(data);
}

export async function buscarNoticiaAdmin(id: string): Promise<Noticia> {
  const { data } = await api.get(`/noticias/admin/${id}`);
  return noticiaSchema.parse(data);
}

export async function criarNoticia(input: CriarNoticiaInput): Promise<Noticia> {
  const { data } = await api.post('/noticias', input);
  return noticiaSchema.parse(data);
}

export async function atualizarNoticia(
  id: string,
  input: AtualizarNoticiaInput,
): Promise<Noticia> {
  const { data } = await api.patch(`/noticias/${id}`, input);
  return noticiaSchema.parse(data);
}

export async function removerNoticia(id: string): Promise<void> {
  await api.delete(`/noticias/${id}`);
}

export async function uploadCapa(arquivo: File): Promise<UploadCapaResponse> {
  const form = new FormData();
  form.append('file', arquivo);
  const { data } = await api.post('/noticias/capa', form);
  return uploadCapaResponseSchema.parse(data);
}
