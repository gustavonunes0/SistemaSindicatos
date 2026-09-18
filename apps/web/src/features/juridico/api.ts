import {
  acaoJuridicaSchema,
  importacaoAcaoJuridicaSchema,
  importarAcaoJuridicaResultadoSchema,
  type ListarAcoesJuridicasQuery,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

export async function listarAcoesJuridicasAdmin(query: ListarAcoesJuridicasQuery = {}) {
  const { data } = await api.get('/juridico/acoes', { params: query });
  return z.array(acaoJuridicaSchema).parse(data);
}

export async function listarImportacoesJuridico() {
  const { data } = await api.get('/juridico/importacoes');
  return z.array(importacaoAcaoJuridicaSchema).parse(data);
}

export async function listarMinhasAcoesJuridicas() {
  const { data } = await api.get('/juridico/minhas');
  return z.array(acaoJuridicaSchema).parse(data);
}

export async function importarPlanilhaJuridico(arquivo: File) {
  const formData = new FormData();
  formData.append('file', arquivo);
  const { data } = await api.post('/juridico/importar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  });
  return importarAcaoJuridicaResultadoSchema.parse(data);
}
