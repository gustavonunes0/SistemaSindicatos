import {
  eventoSchema,
  type AtualizarEventoInput,
  type CriarEventoInput,
  type Evento,
  type FiltroEventosInput,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

export async function listarEventos(filtro: FiltroEventosInput = {}): Promise<Evento[]> {
  const { data } = await api.get('/eventos', { params: filtro });
  return z.array(eventoSchema).parse(data);
}

export async function buscarEvento(id: string): Promise<Evento> {
  const { data } = await api.get(`/eventos/${id}`);
  return eventoSchema.parse(data);
}

export async function listarEventosAdmin(): Promise<Evento[]> {
  const { data } = await api.get('/eventos/admin');
  return z.array(eventoSchema).parse(data);
}

export async function buscarEventoAdmin(id: string): Promise<Evento> {
  const { data } = await api.get(`/eventos/admin/${id}`);
  return eventoSchema.parse(data);
}

export async function criarEvento(input: CriarEventoInput): Promise<Evento> {
  const { data } = await api.post('/eventos', input);
  return eventoSchema.parse(data);
}

export async function atualizarEvento(id: string, input: AtualizarEventoInput): Promise<Evento> {
  const { data } = await api.patch(`/eventos/${id}`, input);
  return eventoSchema.parse(data);
}

export async function removerEvento(id: string): Promise<void> {
  await api.delete(`/eventos/${id}`);
}

export async function uploadFotosEvento(id: string, arquivos: File[]): Promise<Evento> {
  const form = new FormData();
  for (const arquivo of arquivos) {
    form.append('files', arquivo);
  }
  const { data } = await api.post(`/eventos/${id}/fotos`, form, { timeout: 180_000 });
  return eventoSchema.parse(data);
}

export async function removerFotoEvento(eventoId: string, fotoId: string): Promise<void> {
  await api.delete(`/eventos/${eventoId}/fotos/${fotoId}`);
}

export async function reordenarFotosEvento(
  eventoId: string,
  fotoIds: string[],
): Promise<Evento> {
  const { data } = await api.patch(`/eventos/${eventoId}/fotos/ordem`, { fotoIds });
  return eventoSchema.parse(data);
}
