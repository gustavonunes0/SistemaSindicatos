import { linhaAcaoJuridicaImportSchema, type LinhaAcaoJuridicaImport } from '@sindprf/types';
import * as XLSX from 'xlsx';

export type LinhaAcaoJuridicaParseada = LinhaAcaoJuridicaImport & {
  sequencia: number;
};

export type ParsePlanilhaAcoesResultado = {
  linhas: LinhaAcaoJuridicaParseada[];
};

const ALIAS_NOME = ['nome'];
const ALIAS_CPF = ['cpf'];
const ALIAS_NUMERO = [
  'n da acao',
  'nº da acao',
  'numero da acao',
  'numero acao',
  'n acao',
  'no da acao',
  'no acao',
  'numero da acao',
];
const ALIAS_STATUS = ['status'];

function normalizarTexto(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarCabecalho(valor: unknown): string {
  return normalizarTexto(String(valor ?? ''));
}

function celulaParaTexto(valor: unknown): string {
  if (valor == null) return '';
  if (typeof valor === 'number') {
    if (Number.isInteger(valor) && valor >= 0 && valor <= 999_999_999_999) {
      return String(valor).padStart(11, '0').slice(-11);
    }
    return String(valor);
  }
  return String(valor).trim();
}

function indiceColuna(cabecalhos: string[], aliases: string[]): number {
  return cabecalhos.findIndex((cabecalho) => aliases.includes(cabecalho));
}

function mapearColunas(cabecalhos: string[]): Record<'nome' | 'cpf' | 'numeroAcao' | 'status', number> {
  const nome = indiceColuna(cabecalhos, ALIAS_NOME);
  const cpf = indiceColuna(cabecalhos, ALIAS_CPF);
  const numeroAcao = indiceColuna(cabecalhos, ALIAS_NUMERO);
  const status = indiceColuna(cabecalhos, ALIAS_STATUS);

  if (nome < 0 || cpf < 0 || numeroAcao < 0 || status < 0) {
    throw new Error(
      'Planilha inválida. Use as colunas: Nome, CPF, Nº da ação e status (primeira linha como cabeçalho).',
    );
  }

  return { nome, cpf, numeroAcao, status };
}

function linhasDaPlanilha(buffer: Buffer): unknown[][] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const primeiraAba = workbook.SheetNames[0];
  if (!primeiraAba) {
    throw new Error('A planilha está vazia');
  }

  const sheet = workbook.Sheets[primeiraAba];
  if (!sheet) {
    throw new Error('A planilha está vazia');
  }

  const linhas = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];

  if (linhas.length < 2) {
    throw new Error('A planilha precisa ter cabeçalho e ao menos uma linha de dados');
  }

  return linhas;
}

export function parsePlanilhaAcoes(buffer: Buffer): ParsePlanilhaAcoesResultado {
  const linhasBrutas = linhasDaPlanilha(buffer);
  const cabecalhos = (linhasBrutas[0] ?? []).map(normalizarCabecalho);
  const colunas = mapearColunas(cabecalhos);

  const linhas: LinhaAcaoJuridicaParseada[] = [];
  const numerosVistos = new Set<string>();
  const erros: string[] = [];

  for (let indice = 1; indice < linhasBrutas.length; indice += 1) {
    const linha = linhasBrutas[indice] ?? [];
    const bruta = {
      nome: celulaParaTexto(linha[colunas.nome]),
      cpf: celulaParaTexto(linha[colunas.cpf]),
      numeroAcao: celulaParaTexto(linha[colunas.numeroAcao]),
      status: celulaParaTexto(linha[colunas.status]),
    };

    if (!bruta.nome && !bruta.cpf && !bruta.numeroAcao && !bruta.status) {
      continue;
    }

    const parse = linhaAcaoJuridicaImportSchema.safeParse(bruta);
    if (!parse.success) {
      const mensagens = parse.error.issues.map((issue) => issue.message).join('; ');
      erros.push(`Linha ${indice + 1}: ${mensagens}`);
      continue;
    }

    if (numerosVistos.has(parse.data.numeroAcao)) {
      erros.push(`Linha ${indice + 1}: Nº da ação duplicado na planilha (${parse.data.numeroAcao})`);
      continue;
    }
    numerosVistos.add(parse.data.numeroAcao);

    linhas.push({
      ...parse.data,
      sequencia: linhas.length + 1,
    });
  }

  if (linhas.length === 0) {
    const detalhe = erros.length > 0 ? ` Erros: ${erros.slice(0, 5).join(' · ')}` : '';
    throw new Error(`Nenhuma linha válida encontrada na planilha.${detalhe}`);
  }

  if (erros.length > 0) {
    throw new Error(`${erros.length} linha(s) inválida(s). ${erros.slice(0, 5).join(' · ')}`);
  }

  return { linhas };
}
