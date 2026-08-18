import type { CampoFormulario, ItemResposta } from '@sindprf/types';

/** Excel em pt-BR só entende UTF-8 com BOM; sem isso acentos saem quebrados. */
const BOM = '\uFEFF';
const SEPARADOR = ';';

function escapar(valor: string): string {
  const limpo = valor.replace(/\r?\n/g, ' ').trim();
  return /[";]/.test(limpo) ? `"${limpo.replace(/"/g, '""')}"` : limpo;
}

function textoDoItem(item: ItemResposta | undefined): string {
  if (!item) {
    return '';
  }
  if (item.arquivo) {
    return item.arquivo.nome;
  }
  if (item.selecionados.length > 0) {
    return item.selecionados.join(', ');
  }
  return item.texto ?? '';
}

type LinhaResposta = {
  afiliadoNome: string | null;
  afiliadoMatricula: string | null;
  enviadoEm: Date;
  valores: ItemResposta[];
};

export function montarCsv(campos: CampoFormulario[], respostas: LinhaResposta[]): string {
  const cabecalho = ['Enviado em', 'Filiado', 'Matrícula', ...campos.map((campo) => campo.rotulo)];

  const linhas = respostas.map((resposta) => {
    const porCampo = new Map(resposta.valores.map((item) => [item.campoId, item]));
    return [
      resposta.enviadoEm.toISOString(),
      resposta.afiliadoNome ?? 'Anônimo',
      resposta.afiliadoMatricula ?? '',
      ...campos.map((campo) => textoDoItem(porCampo.get(campo.id))),
    ];
  });

  return (
    BOM +
    [cabecalho, ...linhas].map((linha) => linha.map(escapar).join(SEPARADOR)).join('\r\n')
  );
}
