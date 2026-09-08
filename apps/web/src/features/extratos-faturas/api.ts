import {
  contaFinanceiraSchema,
  importacaoFinanceiraDetalheSchema,
  importacaoFinanceiraSchema,
  importarFinanceiroInputSchema,
  listaImportacoesFinanceirasSchema,
  previewImportacaoFinanceiraInputSchema,
  previewImportacaoFinanceiraSchema,
  type ImportacaoFinanceiraDetalheQuery,
  type ImportarFinanceiroInput,
  type PaginacaoFinanceiraQuery,
  type PreviewImportacaoFinanceiraInput,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

export async function listarContasFinanceiras() {
  const { data } = await api.get('/financeiro/contas');
  return z.array(contaFinanceiraSchema).parse(data);
}

export async function criarPreviewFinanceiro(input: PreviewImportacaoFinanceiraInput) {
  const payload = previewImportacaoFinanceiraInputSchema.parse(input);
  const { data } = await api.post('/financeiro/importacoes/preview', payload, {
    timeout: 180_000,
  });
  return previewImportacaoFinanceiraSchema.parse(data);
}

export async function importarDocumentoFinanceiro(input: ImportarFinanceiroInput) {
  const payload = importarFinanceiroInputSchema.parse(input);
  const { data } = await api.post('/financeiro/importacoes', payload, {
    timeout: 180_000,
  });
  return importacaoFinanceiraSchema.parse(data);
}

export async function listarImportacoesFinanceiras(query: PaginacaoFinanceiraQuery) {
  const { data } = await api.get('/financeiro/importacoes', { params: query });
  return listaImportacoesFinanceirasSchema.parse(data);
}

export async function detalharImportacaoFinanceira(
  id: string,
  query: ImportacaoFinanceiraDetalheQuery,
) {
  const { data } = await api.get(`/financeiro/importacoes/${id}`, { params: query });
  return importacaoFinanceiraDetalheSchema.parse(data);
}
