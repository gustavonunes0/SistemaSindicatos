import {
  estatutoSchema,
  type AtualizarEstatutoInput,
  type CriarEstatutoInput,
  type Estatuto,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

export async function listarEstatutosAdmin(): Promise<Estatuto[]> {
  const { data } = await api.get('/estatutos/admin');
  return z.array(estatutoSchema).parse(data);
}

export async function listarEstatutos(): Promise<Estatuto[]> {
  const { data } = await api.get('/estatutos');
  return z.array(estatutoSchema).parse(data);
}

export async function criarEstatuto(
  input: CriarEstatutoInput,
  arquivo: File,
): Promise<Estatuto> {
  const form = new FormData();
  form.append('titulo', input.titulo);
  form.append('ordem', String(input.ordem ?? 0));
  form.append('ativo', String(input.ativo ?? true));
  form.append('arquivo', arquivo);
  const { data } = await api.post('/estatutos', form);
  return estatutoSchema.parse(data);
}

export async function atualizarEstatuto(
  id: string,
  input: AtualizarEstatutoInput,
): Promise<Estatuto> {
  const { data } = await api.patch(`/estatutos/${id}`, input);
  return estatutoSchema.parse(data);
}

export async function removerEstatuto(id: string): Promise<void> {
  await api.delete(`/estatutos/${id}`);
}

export async function abrirEstatuto(
  id: string,
  nomeOriginal: string,
  modo: 'admin' | 'afiliado',
): Promise<void> {
  const caminho =
    modo === 'admin' ? `/estatutos/admin/${id}/arquivo` : `/estatutos/${id}/arquivo`;
  const aba = window.open('about:blank', '_blank');
  try {
    const { data } = await api.get<Blob>(caminho, { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    if (aba) {
      aba.location.href = url;
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeOriginal;
      link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (erro) {
    aba?.close();
    throw erro;
  }
}
