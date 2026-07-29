import {
  importacaoBalanceteDetalheSchema,
  importacaoBalanceteSchema,
  importarBalanceteResultadoSchema,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';
import { extrairTextoBalancetePdf } from './extrairPdf';

export async function listarImportacoesBalancete() {
  const { data } = await api.get('/balancetes');
  return z.array(importacaoBalanceteSchema).parse(data);
}

export async function detalheImportacaoBalancete(id: string) {
  const { data } = await api.get(`/balancetes/${id}`);
  return importacaoBalanceteDetalheSchema.parse(data);
}

export async function importarBalancete(input: { arquivo: File }) {
  const texto = await extrairTextoBalancetePdf(input.arquivo);
  const { data } = await api.post(
    '/balancetes/importar',
    {
      texto,
      arquivoNome: input.arquivo.name,
    },
    { timeout: 180_000 },
  );
  return importarBalanceteResultadoSchema.parse(data);
}
