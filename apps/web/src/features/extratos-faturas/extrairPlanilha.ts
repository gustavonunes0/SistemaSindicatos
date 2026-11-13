import {
  planilhaFinanceiraSchema,
  type ConteudoDocumentoFinanceiro,
} from '@sindprf/types';
import type { WorkBook, WorkSheet } from 'xlsx';
import type { ZodIssue } from 'zod';

type Celula = string | number | boolean | null;
type Linha = Celula[];
type ParseDataCode = (serial: number) => { y: number; m: number; d: number } | null;

const EXTENSOES_PLANILHA = ['.xlsx', '.xls'];
const ABA_DOCUMENTO = 'documento';
const ABA_LANCAMENTOS = 'lancamentos';
const COLUNAS_OBRIGATORIAS = ['data', 'descricao', 'tipo', 'valor'] as const;
const CAMPOS_DATA = new Set(['periodoInicio', 'periodoFim', 'vencimento', 'data']);
const CAMPOS_NUMERO = new Set([
  'totalDocumento',
  'saldoInicial',
  'saldoFinal',
  'valor',
  'saldoApos',
]);
const CAMPOS_INTEIRO = new Set([
  'competenciaAno',
  'competenciaMes',
  'parcelaNumero',
  'parcelaTotal',
]);
const CAMPOS_ENUM = new Set(['instituicao', 'tipoDocumento', 'tipo']);
const CAMPOS_DOCUMENTO = [
  'instituicao',
  'tipoDocumento',
  'competenciaAno',
  'competenciaMes',
  'periodoInicio',
  'periodoFim',
  'vencimento',
  'totalDocumento',
  'saldoInicial',
  'saldoFinal',
  'agencia',
  'numero',
  'nomeConta',
  'titularNome',
  'titularDocumento',
] as const;
const COLUNAS_LANCAMENTO = [
  'data',
  'descricao',
  'documento',
  'tipo',
  'valor',
  'saldoApos',
  'contraparteNome',
  'contraparteDocumento',
  'portadorNome',
  'cartaoFinal',
  'parcelaNumero',
  'parcelaTotal',
] as const;

class ErroPlanilha extends Error {}

export function ehPlanilha(arquivo: File): boolean {
  const nome = arquivo.name.toLowerCase();
  return EXTENSOES_PLANILHA.some((extensao) => nome.endsWith(extensao));
}

function normalizarChave(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function texto(valor: Celula): string | null {
  if (valor === null) return null;
  const conteudo = String(valor).trim();
  return conteudo || null;
}

function numero(valor: Celula, campo: string): number | null {
  if (typeof valor === 'number') return Math.round(valor * 100) / 100;
  const bruto = texto(valor)?.replace(/R\$|\s/g, '');
  if (!bruto) return null;
  const decimalComVirgula = bruto.lastIndexOf(',') > bruto.lastIndexOf('.');
  const normalizado = decimalComVirgula
    ? bruto.replace(/\./g, '').replace(',', '.')
    : bruto.replace(/,/g, '');
  const resultado = Number(normalizado);
  if (!Number.isFinite(resultado)) {
    throw new ErroPlanilha(`${campo}: "${bruto}" não é um número válido`);
  }
  return Math.round(resultado * 100) / 100;
}

function inteiro(valor: Celula, campo: string): number | null {
  const resultado = numero(valor, campo);
  if (resultado === null) return null;
  if (!Number.isInteger(resultado)) {
    throw new ErroPlanilha(`${campo}: "${resultado}" deve ser um número inteiro`);
  }
  return resultado;
}

function dataUtc(ano: number, mes: number, dia: number, campo: string, original: string): Date {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    throw new ErroPlanilha(`${campo}: data "${original}" inválida`);
  }
  return data;
}

function data(valor: Celula, campo: string, parseDataCode: ParseDataCode): Date | null {
  if (typeof valor === 'number') {
    const partes = parseDataCode(valor);
    if (!partes) throw new ErroPlanilha(`${campo}: data inválida`);
    return dataUtc(partes.y, partes.m, partes.d, campo, String(valor));
  }
  const bruto = texto(valor);
  if (!bruto) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(bruto);
  if (iso) return dataUtc(Number(iso[1]), Number(iso[2]), Number(iso[3]), campo, bruto);
  const brasileira = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(bruto);
  if (brasileira) {
    return dataUtc(Number(brasileira[3]), Number(brasileira[2]), Number(brasileira[1]), campo, bruto);
  }
  throw new ErroPlanilha(`${campo}: use AAAA-MM-DD ou DD/MM/AAAA (recebido "${bruto}")`);
}

function converterCampo(
  campo: string,
  valor: Celula,
  parseDataCode: ParseDataCode,
): string | number | Date | null {
  if (CAMPOS_DATA.has(campo)) return data(valor, campo, parseDataCode);
  if (CAMPOS_INTEIRO.has(campo)) return inteiro(valor, campo);
  if (CAMPOS_NUMERO.has(campo)) return numero(valor, campo);
  const conteudo = texto(valor);
  if (conteudo && CAMPOS_ENUM.has(campo)) return normalizarChave(conteudo).toUpperCase();
  return conteudo;
}

function linhasDaAba(XLSX: typeof import('xlsx'), aba: WorkSheet): Linha[] {
  return XLSX.utils.sheet_to_json<Linha>(aba, { header: 1, raw: true, defval: null, blankrows: false });
}

function abaPorNome(livro: WorkBook, nome: string): WorkSheet {
  const encontrada = livro.SheetNames.find((atual) => normalizarChave(atual) === nome);
  const aba = encontrada ? livro.Sheets[encontrada] : undefined;
  if (!aba) {
    throw new ErroPlanilha(
      `A planilha não segue o modelo: aba "${nome === ABA_DOCUMENTO ? 'Documento' : 'Lancamentos'}" não encontrada.`,
    );
  }
  return aba;
}

function lerDocumento(
  linhas: Linha[],
  parseDataCode: ParseDataCode,
): Record<string, string | number | Date | null> {
  const valores = new Map<string, Celula>();
  for (const [campo, valor] of linhas.slice(1)) {
    const chave = texto(campo ?? null);
    if (chave) valores.set(normalizarChave(chave), valor ?? null);
  }
  return Object.fromEntries(
    CAMPOS_DOCUMENTO.map((campo) => [
      campo,
      converterCampo(campo, valores.get(normalizarChave(campo)) ?? null, parseDataCode),
    ]),
  );
}

function lerLancamentos(linhas: Linha[], parseDataCode: ParseDataCode) {
  const [cabecalho = [], ...corpo] = linhas;
  const indices = new Map(
    cabecalho.map((titulo, indice) => [normalizarChave(String(titulo ?? '')), indice]),
  );
  const ausentes = COLUNAS_OBRIGATORIAS.filter((coluna) => !indices.has(coluna));
  if (ausentes.length > 0) {
    throw new ErroPlanilha(`Aba Lancamentos sem as colunas: ${ausentes.join(', ')}.`);
  }

  const numerosLinha: number[] = [];
  const lancamentos = corpo.flatMap((linha, posicao) => {
    if (linha.every((celula) => texto(celula) === null)) return [];
    const numeroLinha = posicao + 2;
    numerosLinha.push(numeroLinha);
    try {
      return [
        Object.fromEntries(
          COLUNAS_LANCAMENTO.map((coluna) => {
            const indice = indices.get(normalizarChave(coluna));
            const valor = indice === undefined ? null : (linha[indice] ?? null);
            return [coluna, converterCampo(coluna, valor, parseDataCode)];
          }),
        ),
      ];
    } catch (erro) {
      throw new ErroPlanilha(`Lancamentos, linha ${numeroLinha}: ${(erro as Error).message}`);
    }
  });
  return { lancamentos, numerosLinha };
}

function mensagemDoProblema(problema: ZodIssue, numerosLinha: number[]): string {
  const [raiz, indice, campo] = problema.path;
  const detalhe =
    problema.code === 'invalid_enum_value'
      ? `valor inválido (use ${problema.options.join(' ou ')})`
      : problema.code === 'invalid_type' && problema.received === 'null'
        ? 'campo obrigatório'
        : problema.message;
  if (raiz === 'lancamentos' && typeof indice === 'number') {
    return `Lancamentos, linha ${numerosLinha[indice] ?? indice + 2}: ${String(campo ?? '')} — ${detalhe}`;
  }
  return `Documento: ${String(raiz ?? '')} — ${detalhe}`;
}

export async function extrairConteudoPlanilha(
  arquivo: File,
): Promise<ConteudoDocumentoFinanceiro> {
  const XLSX = await import('xlsx');
  const livro = XLSX.read(await arquivo.arrayBuffer(), { type: 'array' });
  const parseDataCode: ParseDataCode = (serial) => XLSX.SSF.parse_date_code(serial);

  try {
    const documento = lerDocumento(linhasDaAba(XLSX, abaPorNome(livro, ABA_DOCUMENTO)), parseDataCode);
    const { lancamentos, numerosLinha } = lerLancamentos(
      linhasDaAba(XLSX, abaPorNome(livro, ABA_LANCAMENTOS)),
      parseDataCode,
    );
    const resultado = planilhaFinanceiraSchema.safeParse({ ...documento, lancamentos });
    if (!resultado.success) {
      const mensagens = resultado.error.issues
        .slice(0, 3)
        .map((problema) => mensagemDoProblema(problema, numerosLinha));
      throw new ErroPlanilha(mensagens.join(' | '));
    }
    return { planilha: resultado.data };
  } catch (erro) {
    if (erro instanceof ErroPlanilha) throw erro;
    throw new ErroPlanilha('Não foi possível ler a planilha. Use o modelo padrão.');
  }
}
