import {
  alertaPublicoSchema,
  alertaSchema,
  uploadImagemAlertaResponseSchema,
  type Alerta,
  type AlertaPublico,
  type AtualizarAlertaInput,
  type CriarAlertaInput,
  type UploadImagemAlertaResponse,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

/** A API já devolve só o que este visitante pode ver. */
export async function listarAlertasAtivos(): Promise<AlertaPublico[]> {
  const { data } = await api.get('/alertas/ativos');
  return z.array(alertaPublicoSchema).parse(data);
}

export async function listarAlertasAdmin(): Promise<Alerta[]> {
  const { data } = await api.get('/alertas/admin');
  return z.array(alertaSchema).parse(data);
}

export async function buscarAlertaAdmin(id: string): Promise<Alerta> {
  const { data } = await api.get(`/alertas/admin/${id}`);
  return alertaSchema.parse(data);
}

export async function criarAlerta(input: CriarAlertaInput): Promise<Alerta> {
  const { data } = await api.post('/alertas', input);
  return alertaSchema.parse(data);
}

export async function atualizarAlerta(
  id: string,
  input: AtualizarAlertaInput,
): Promise<Alerta> {
  const { data } = await api.patch(`/alertas/${id}`, input);
  return alertaSchema.parse(data);
}

export async function removerAlerta(id: string): Promise<void> {
  await api.delete(`/alertas/${id}`);
}

export async function uploadImagemAlerta(arquivo: File): Promise<UploadImagemAlertaResponse> {
  const form = new FormData();
  form.append('file', arquivo);
  const { data } = await api.post('/alertas/imagem', form);
  return uploadImagemAlertaResponseSchema.parse(data);
}
