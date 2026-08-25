import {
  afiliadoFichaSchema,
  afiliadoSchema,
  type AdminAtualizarSenhaAfiliadoInput,
  type AfiliadoFicha,
  type CadastroAfiliadoAdminInput,
  type CadastroAfiliadoInput,
  type DocumentoAfiliado,
  type FiltroAfiliadosInput,
  type StatusAfiliado,
  type TipoDocumentoFiliacao,
} from '@sindprf/types';
import { z } from 'zod';
import { api } from '../../lib/http';

const afiliadoAdminSchema = afiliadoSchema.extend({
  user: z.object({ email: z.string() }),
});

export type AfiliadoAdmin = z.infer<typeof afiliadoAdminSchema>;

export const afiliadosAdminPaginadosSchema = z.object({
  items: z.array(afiliadoAdminSchema),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export type AfiliadosAdminPaginados = z.infer<typeof afiliadosAdminPaginadosSchema>;

export type DocumentosCadastro = Partial<Record<TipoDocumentoFiliacao, File>>;

export async function listarAfiliadosAdmin(
  filtro: Partial<FiltroAfiliadosInput> = {},
): Promise<AfiliadosAdminPaginados> {
  const params: Record<string, string | number> = {};
  if (filtro.status) params.status = filtro.status;
  if (filtro.busca?.trim()) params.busca = filtro.busca.trim();
  if (filtro.page) params.page = filtro.page;
  if (filtro.limit) params.limit = filtro.limit;
  if (filtro.ordenar) params.ordenar = filtro.ordenar;
  if (filtro.direcao) params.direcao = filtro.direcao;

  const { data } = await api.get('/afiliados', { params });
  return afiliadosAdminPaginadosSchema.parse(data);
}

const CAMPO_DOCUMENTO: Record<TipoDocumentoFiliacao, string> = {
  IDENTIDADE_CPF: 'identidadeCpf',
  COMPROVANTE_ENDERECO: 'comprovanteEndereco',
  CONTRACHEQUE: 'contracheque',
  FOTO_3X4: 'foto3x4',
};

/** Data pura (sem hora) no formato que o schema compartilhado sabe reler. */
function dataIso(valor: Date): string {
  return valor.toISOString().slice(0, 10);
}

export async function cadastrarAfiliado(
  input: CadastroAfiliadoInput,
  documentos: DocumentosCadastro,
): Promise<void> {
  const { dependentes, aceiteEstatuto, dataNascimento, dataAdmissao, ...campos } = input;
  const form = new FormData();

  for (const [campo, valor] of Object.entries(campos)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      form.append(campo, String(valor));
    }
  }
  form.append('dataNascimento', dataIso(dataNascimento));
  form.append('dataAdmissao', dataIso(dataAdmissao));
  form.append('aceiteEstatuto', String(aceiteEstatuto));
  form.append(
    'dependentes',
    JSON.stringify(
      dependentes.map((dependente) => ({
        ...dependente,
        dataNascimento: dataIso(dependente.dataNascimento),
      })),
    ),
  );

  for (const [tipo, arquivo] of Object.entries(documentos) as [
    TipoDocumentoFiliacao,
    File | undefined,
  ][]) {
    if (arquivo) form.append(CAMPO_DOCUMENTO[tipo], arquivo);
  }

  const { data } = await api.post('/afiliados/cadastro', form);
  afiliadoSchema.parse(data);
}

export async function cadastrarAfiliadoAdmin(input: CadastroAfiliadoAdminInput): Promise<AfiliadoAdmin> {
  const { data } = await api.post('/afiliados', input);
  return afiliadoAdminSchema.parse(data);
}

export async function atualizarStatusAfiliado(id: string, status: StatusAfiliado) {
  const { data } = await api.patch(`/afiliados/${id}/status`, { status });
  return afiliadoSchema.parse(data);
}

export async function atualizarSenhaAfiliadoAdmin(
  id: string,
  input: AdminAtualizarSenhaAfiliadoInput,
): Promise<void> {
  await api.patch(`/afiliados/${id}/senha`, input);
}

export async function buscarFichaAfiliado(id: string): Promise<AfiliadoFicha> {
  const { data } = await api.get(`/afiliados/${id}`);
  return afiliadoFichaSchema.parse(data);
}

export async function abrirDocumentoAfiliado(
  afiliadoId: string,
  documento: DocumentoAfiliado,
  modo: 'visualizar' | 'baixar',
): Promise<void> {
  // Abre a aba durante o clique; se esperar a rede, alguns navegadores tratam
  // a abertura posterior como popup e bloqueiam a visualização.
  const aba = modo === 'visualizar' ? window.open('about:blank', '_blank') : null;
  let data: Blob;
  try {
    const resposta = await api.get<Blob>(
      `/afiliados/${afiliadoId}/documentos/${documento.id}/arquivo`,
      {
        params: { modo: modo === 'visualizar' ? 'inline' : 'attachment' },
        responseType: 'blob',
      },
    );
    data = resposta.data;
  } catch (erro) {
    aba?.close();
    throw erro;
  }
  const blob =
    data.type === documento.mimeType ? data : new Blob([data], { type: documento.mimeType });
  const url = URL.createObjectURL(blob);
  if (modo === 'visualizar') {
    if (aba) {
      aba.opener = null;
      aba.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const link = document.createElement('a');
  link.href = url;
  link.download = documento.nomeOriginal;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
