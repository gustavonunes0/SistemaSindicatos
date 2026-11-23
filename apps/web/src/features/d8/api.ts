import {
  importacaoD8DetalheSchema,
  importacaoD8Schema,
  importarD8ResultadoSchema,
  linhaD8Schema,
  type FiltroLinhasD8,
  type TipoD8,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';
import { extrairTextoPdf } from './extrairPdf';

export async function listarImportacoesD8() {
  const { data } = await api.get('/d8');
  return z.array(importacaoD8Schema).parse(data);
}

export async function detalheImportacaoD8(id: string) {
  const { data } = await api.get(`/d8/${id}`);
  return importacaoD8DetalheSchema.parse(data);
}

export async function listarLinhasD8(id: string, filtro: FiltroLinhasD8 = 'todos') {
  const { data } = await api.get(`/d8/${id}/linhas`, { params: { filtro } });
  return z.array(linhaD8Schema).parse(data);
}

export async function excluirImportacaoD8(id: string): Promise<void> {
  await api.delete(`/d8/${id}`);
}

export async function importarD8(input: {
  arquivo: File;
  tipo: TipoD8;
  substituirBase?: boolean;
}) {
  const texto = await extrairTextoPdf(input.arquivo);
  const { data } = await api.post(
    '/d8/importar',
    {
      tipo: input.tipo,
      substituirBase: input.substituirBase ?? false,
      texto,
      arquivoNome: input.arquivo.name,
    },
    { timeout: 300_000 },
  );
  return importarD8ResultadoSchema.parse(data);
}
