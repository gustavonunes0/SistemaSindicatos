import {
  declaracaoEmitidaSchema,
  uploadAssinaturaResponseSchema,
  type DeclaracaoEmitida,
  type ListarDeclaracoesQuery,
  type UploadAssinaturaResponse,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

export async function listarDeclaracoesAdmin(
  query: ListarDeclaracoesQuery,
): Promise<DeclaracaoEmitida[]> {
  const { data } = await api.get('/declaracoes/admin', { params: query });
  return z.array(declaracaoEmitidaSchema).parse(data);
}

export async function listarMinhasDeclaracoes(): Promise<DeclaracaoEmitida[]> {
  const { data } = await api.get('/declaracoes/minhas');
  return z.array(declaracaoEmitidaSchema).parse(data);
}

/** Dispara o download do PDF; o nome vem do Content-Disposition da API. */
export async function baixarDeclaracao(
  id: string,
  versao: 'original' | 'assinada',
): Promise<void> {
  const resposta = await api.get(`/declaracoes/${id}/arquivo`, {
    params: { versao },
    responseType: 'blob',
  });

  const disposition = String(resposta.headers['content-disposition'] ?? '');
  const nomeArquivo = /filename="([^"]+)"/i.exec(disposition)?.[1] ?? `declaracao-${id}.pdf`;

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

export async function enviarDeclaracaoAssinada(
  id: string,
  arquivo: File,
): Promise<DeclaracaoEmitida> {
  const form = new FormData();
  form.append('file', arquivo);
  const { data } = await api.post(`/declaracoes/${id}/assinada`, form);
  return declaracaoEmitidaSchema.parse(data);
}

export async function removerDeclaracaoAssinada(id: string): Promise<DeclaracaoEmitida> {
  const { data } = await api.delete(`/declaracoes/${id}/assinada`);
  return declaracaoEmitidaSchema.parse(data);
}

export async function enviarRubrica(arquivo: File): Promise<UploadAssinaturaResponse> {
  const form = new FormData();
  form.append('file', arquivo);
  const { data } = await api.post('/declaracoes/assinatura', form);
  return uploadAssinaturaResponseSchema.parse(data);
}

export async function removerRubrica(): Promise<void> {
  await api.delete('/declaracoes/assinatura');
}
