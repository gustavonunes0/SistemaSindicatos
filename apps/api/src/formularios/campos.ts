import { BadRequestException } from '@nestjs/common';
import {
  campoFormularioSchema,
  campoTemOpcoes,
  itemRespostaSchema,
  type CampoFormulario,
  type ItemResposta,
  type ValorEnviado,
} from '@sindprf/types';
import { z } from 'zod';

const camposArmazenadosSchema = z.array(campoFormularioSchema);
const itensArmazenadosSchema = z.array(itemRespostaSchema);

const LIMITE_TEXTO_CURTO = 500;
const LIMITE_TEXTO_LONGO = 5000;

/**
 * Lê a coluna Json de perguntas. Se o conteúdo estiver corrompido devolve lista
 * vazia em vez de derrubar a listagem inteira por causa de um registro ruim.
 */
export function lerCampos(valor: unknown): CampoFormulario[] {
  const resultado = camposArmazenadosSchema.safeParse(valor);
  return resultado.success ? resultado.data : [];
}

export function lerItensResposta(valor: unknown): ItemResposta[] {
  const resultado = itensArmazenadosSchema.safeParse(valor);
  return resultado.success ? resultado.data : [];
}

function textoLimpo(valor: string | null | undefined): string {
  return (valor ?? '').trim();
}

/**
 * Confere uma resposta contra a definição da pergunta e devolve o item já no
 * formato de gravação.
 *
 * Tudo que descreve a pergunta (rótulo e tipo) vem do formulário guardado no
 * banco, nunca do que o navegador enviou — senão daria para forjar o enunciado
 * de uma resposta.
 */
function validarCampo(campo: CampoFormulario, enviado: ValorEnviado | undefined): ItemResposta {
  const item: ItemResposta = {
    campoId: campo.id,
    rotulo: campo.rotulo,
    tipo: campo.tipo,
    texto: null,
    selecionados: [],
    arquivo: null,
  };

  const exigir = (preenchido: boolean): void => {
    if (campo.obrigatorio && !preenchido) {
      throw new BadRequestException(`Responda "${campo.rotulo}"`);
    }
  };

  switch (campo.tipo) {
    case 'TEXTO_CURTO':
    case 'TEXTO_LONGO': {
      const texto = textoLimpo(enviado?.texto);
      const limite = campo.tipo === 'TEXTO_CURTO' ? LIMITE_TEXTO_CURTO : LIMITE_TEXTO_LONGO;
      if (texto.length > limite) {
        throw new BadRequestException(`"${campo.rotulo}" excede ${limite} caracteres`);
      }
      exigir(texto.length > 0);
      item.texto = texto || null;
      break;
    }

    case 'NUMERO': {
      const texto = textoLimpo(enviado?.texto);
      if (texto && !Number.isFinite(Number(texto))) {
        throw new BadRequestException(`"${campo.rotulo}" deve ser um número`);
      }
      exigir(texto.length > 0);
      item.texto = texto || null;
      break;
    }

    case 'DATA': {
      const texto = textoLimpo(enviado?.texto);
      if (texto && Number.isNaN(new Date(texto).getTime())) {
        throw new BadRequestException(`"${campo.rotulo}" deve ser uma data válida`);
      }
      exigir(texto.length > 0);
      item.texto = texto || null;
      break;
    }

    case 'ESCOLHA_UNICA':
    case 'LISTA': {
      const texto = textoLimpo(enviado?.texto);
      if (texto && !campo.opcoes.includes(texto)) {
        throw new BadRequestException(`Opção inválida em "${campo.rotulo}"`);
      }
      exigir(texto.length > 0);
      item.texto = texto || null;
      break;
    }

    case 'MULTIPLA_ESCOLHA': {
      const selecionados = [...new Set(enviado?.selecionados ?? [])];
      const invalida = selecionados.find((opcao) => !campo.opcoes.includes(opcao));
      if (invalida) {
        throw new BadRequestException(`Opção inválida em "${campo.rotulo}"`);
      }
      exigir(selecionados.length > 0);
      item.selecionados = selecionados;
      break;
    }

    case 'ARQUIVO': {
      const arquivo = enviado?.arquivo ?? null;
      exigir(arquivo !== null);
      item.arquivo = arquivo;
      break;
    }
  }

  return item;
}

/**
 * Monta os itens de uma resposta percorrendo as perguntas do formulário.
 *
 * A varredura é pelas perguntas, e não pelo que veio no corpo, então campos
 * extras inventados pelo cliente são simplesmente ignorados.
 */
export function montarItensResposta(
  campos: CampoFormulario[],
  valores: ValorEnviado[],
): ItemResposta[] {
  const enviados = new Map(valores.map((valor) => [valor.campoId, valor]));
  return campos.map((campo) => validarCampo(campo, enviados.get(campo.id)));
}

/** Contagem por opção das perguntas de escolha, para a tela de respostas. */
export function resumirRespostas(campos: CampoFormulario[], respostas: ItemResposta[][]) {
  return campos.filter((campo) => campoTemOpcoes(campo.tipo)).map((campo) => {
    const contagem = new Map(campo.opcoes.map((opcao) => [opcao, 0]));
    let totalRespondido = 0;

    for (const itens of respostas) {
      const item = itens.find((valor) => valor.campoId === campo.id);
      if (!item) {
        continue;
      }
      const marcados =
        campo.tipo === 'MULTIPLA_ESCOLHA' ? item.selecionados : [item.texto ?? ''].filter(Boolean);
      if (marcados.length > 0) {
        totalRespondido += 1;
      }
      for (const opcao of marcados) {
        contagem.set(opcao, (contagem.get(opcao) ?? 0) + 1);
      }
    }

    return {
      campoId: campo.id,
      rotulo: campo.rotulo,
      tipo: campo.tipo,
      totalRespondido,
      contagem: [...contagem].map(([opcao, total]) => ({ opcao, total })),
    };
  });
}
