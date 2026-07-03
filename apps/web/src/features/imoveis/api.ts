import {
  disponibilidadeImovelSchema,
  imovelSchema,
  periodoSchema,
  type AtualizarImovelInput,
  type ConsultaDisponibilidadeInput,
  type CriarImovelInput,
  type CriarPeriodoInput,
  type FiltroImoveisInput,
  type Imovel,
  type Periodo,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

export async function listarImoveis(filtro: FiltroImoveisInput): Promise<Imovel[]> {
  const { data } = await api.get('/imoveis', { params: filtro });
  return z.array(imovelSchema).parse(data);
}

export async function buscarImovel(id: string): Promise<Imovel> {
  const { data } = await api.get(`/imoveis/${id}`);
  return imovelSchema.parse(data);
}

export async function consultarDisponibilidade(
  id: string,
  consulta: ConsultaDisponibilidadeInput,
) {
  const { data } = await api.get(`/imoveis/${id}/disponibilidade`, {
    params: {
      inicio: consulta.inicio.toISOString(),
      fim: consulta.fim.toISOString(),
    },
  });
  return disponibilidadeImovelSchema.parse(data);
}

export async function listarImoveisAdmin(): Promise<Imovel[]> {
  const { data } = await api.get('/imoveis/admin');
  return z.array(imovelSchema).parse(data);
}

export async function buscarImovelAdmin(id: string): Promise<Imovel> {
  const { data } = await api.get(`/imoveis/admin/${id}`);
  return imovelSchema.parse(data);
}

export async function listarPeriodosAdmin(imovelId: string): Promise<Periodo[]> {
  const { data } = await api.get(`/imoveis/admin/${imovelId}/periodos`);
  return z.array(periodoSchema).parse(data);
}

export async function criarImovel(input: CriarImovelInput): Promise<Imovel> {
  const { data } = await api.post('/imoveis', input);
  return imovelSchema.parse(data);
}

export async function atualizarImovel(id: string, input: AtualizarImovelInput): Promise<Imovel> {
  const { data } = await api.patch(`/imoveis/${id}`, input);
  return imovelSchema.parse(data);
}

export async function removerImovel(id: string): Promise<void> {
  await api.delete(`/imoveis/${id}`);
}

export async function uploadFotosImovel(id: string, arquivos: File[]): Promise<Imovel> {
  const form = new FormData();
  for (const arquivo of arquivos) {
    form.append('files', arquivo);
  }
  const { data } = await api.post(`/imoveis/${id}/fotos`, form);
  return imovelSchema.parse(data);
}

export async function removerFotoImovel(imovelId: string, fotoId: string): Promise<void> {
  await api.delete(`/imoveis/${imovelId}/fotos/${fotoId}`);
}

export async function criarPeriodoImovel(
  imovelId: string,
  input: CriarPeriodoInput,
): Promise<Periodo> {
  const { data } = await api.post(`/imoveis/${imovelId}/periodos`, input);
  return periodoSchema.parse(data);
}

export async function removerPeriodoImovel(imovelId: string, periodoId: string): Promise<void> {
  await api.delete(`/imoveis/${imovelId}/periodos/${periodoId}`);
}
