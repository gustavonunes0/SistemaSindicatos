import {
  contaFinanceiraSchema,
  importacaoFinanceiraDetalheSchema,
  importacaoFinanceiraSchema,
  importarFinanceiroInputSchema,
  listaImportacoesFinanceirasSchema,
  previewImportacaoFinanceiraInputSchema,
  previewImportacaoFinanceiraSchema,
  renomearImportacaoFinanceiraSchema,
  type ImportacaoFinanceiraDetalheQuery,
  type ImportarFinanceiroInput,
  type PaginacaoFinanceiraQuery,
  type PreviewImportacaoFinanceiraInput,
  type RenomearImportacaoFinanceira,
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

export async function renomearImportacaoFinanceira(
  id: string,
  input: RenomearImportacaoFinanceira,
) {
  const payload = renomearImportacaoFinanceiraSchema.parse(input);
  const { data } = await api.patch(`/financeiro/importacoes/${id}`, payload);
  return importacaoFinanceiraSchema.extend({ conta: contaFinanceiraSchema }).parse(data);
}

export async function excluirImportacaoFinanceira(id: string) {
  await api.delete(`/financeiro/importacoes/${id}`);
}

export async function detalharImportacaoFinanceira(
  id: string,
  query: ImportacaoFinanceiraDetalheQuery,
) {
  const { data } = await api.get(`/financeiro/importacoes/${id}`, { params: query });
  return importacaoFinanceiraDetalheSchema.parse(data);
}
