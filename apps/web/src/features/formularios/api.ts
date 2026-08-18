import {
  formularioListagemSchema,
  formularioPublicoSchema,
  formularioSchema,
  respostasFormularioSchema,
  uploadArquivoFormularioResponseSchema,
  type AtualizarFormularioInput,
  type CriarFormularioInput,
  type EnviarRespostaInput,
  type Formulario,
  type FormularioListagem,
  type FormularioPublico,
  type RespostasFormulario,
  type UploadArquivoFormularioResponse,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

const formularioDisponivelSchema = formularioListagemSchema
  .omit({ totalRespostas: true })
  .extend({ jaRespondeu: z.boolean() });
export type FormularioDisponivel = z.infer<typeof formularioDisponivelSchema>;

export async function listarFormulariosAdmin(): Promise<FormularioListagem[]> {
  const { data } = await api.get('/formularios/admin');
  return z.array(formularioListagemSchema).parse(data);
}

export async function buscarFormularioAdmin(id: string): Promise<Formulario> {
  const { data } = await api.get(`/formularios/admin/${id}`);
  return formularioSchema.parse(data);
}

export async function listarRespostas(formularioId: string): Promise<RespostasFormulario> {
  const { data } = await api.get(`/formularios/admin/${formularioId}/respostas`);
  return respostasFormularioSchema.parse(data);
}

export async function criarFormulario(input: CriarFormularioInput): Promise<Formulario> {
  const { data } = await api.post('/formularios', input);
  return formularioSchema.parse(data);
}

export async function atualizarFormulario(
  id: string,
  input: AtualizarFormularioInput,
): Promise<Formulario> {
  const { data } = await api.patch(`/formularios/${id}`, input);
  return formularioSchema.parse(data);
}

export async function removerFormulario(id: string): Promise<void> {
  await api.delete(`/formularios/${id}`);
}

export async function removerResposta(id: string): Promise<void> {
  await api.delete(`/formularios/respostas/${id}`);
}

/** Baixa o CSV como blob para preservar o BOM que o Excel espera. */
export async function baixarRespostasCsv(formularioId: string, nomeArquivo: string): Promise<void> {
  const { data } = await api.get(`/formularios/admin/${formularioId}/respostas.csv`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

export async function listarFormulariosDisponiveis(): Promise<FormularioDisponivel[]> {
  const { data } = await api.get('/formularios/disponiveis');
  return z.array(formularioDisponivelSchema).parse(data);
}

export async function buscarFormularioPublico(slug: string): Promise<FormularioPublico> {
  const { data } = await api.get(`/formularios/${slug}`);
  return formularioPublicoSchema.parse(data);
}

export async function enviarResposta(
  slug: string,
  input: EnviarRespostaInput,
): Promise<{ id: string }> {
  const { data } = await api.post(`/formularios/${slug}/respostas`, input);
  return z.object({ id: z.string() }).parse(data);
}

export async function uploadArquivoFormulario(
  slug: string,
  arquivo: File,
): Promise<UploadArquivoFormularioResponse> {
  const form = new FormData();
  form.append('file', arquivo);
  const { data } = await api.post(`/formularios/${slug}/arquivo`, form);
  return uploadArquivoFormularioResponseSchema.parse(data);
}
