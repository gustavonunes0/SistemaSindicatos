import { readdir, readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { previewImportacaoFinanceiraSchema, type PaginaFinanceira } from '@sindprf/types';
import { parseDocumentoFinanceiro } from '../src/financeiro/financeiro-parser';

type ResultadoValidacao = {
  aceitos: number;
  rejeitados: number;
  duplicados: number;
  porLayout: Record<string, number>;
  lancamentosPorLayout: Record<string, number>;
  competenciasPorLayout: Record<string, string[]>;
  semMovimento: number;
  totalLancamentos: number;
  saldosDivergentes: number;
  contasNaoDetectadas: number;
  lancamentosFaturaComPortador: number;
  lancamentosFaturaComFinal: number;
  lancamentosParcelados: number;
  fingerprintsRepetidosNoDocumento: number;
  erros: Record<string, number>;
};

async function listarPdfs(diretorio: string): Promise<string[]> {
  const entradas = await readdir(diretorio, { withFileTypes: true });
  const arquivos = await Promise.all(
    entradas.map(async (entrada) => {
      const caminho = resolve(diretorio, entrada.name);
      if (entrada.isDirectory()) return listarPdfs(caminho);
      return entrada.isFile() && entrada.name.toLowerCase().endsWith('.pdf') ? [caminho] : [];
    }),
  );
  return arquivos.flat().sort();
}

async function extrairPaginas(caminho: string): Promise<PaginaFinanceira[]> {
  const dados = new Uint8Array(await readFile(caminho));
  const documento = await getDocument({ data: dados, useSystemFonts: true }).promise;
  const paginas: PaginaFinanceira[] = [];
  try {
    for (let numero = 1; numero <= documento.numPages; numero += 1) {
      const pagina = await documento.getPage(numero);
      const conteudo = await pagina.getTextContent();
      const itens = conteudo.items.flatMap((item) => {
        if (!('str' in item) || typeof item.str !== 'string' || !Array.isArray(item.transform)) {
          return [];
        }
        const texto = item.str.trim();
        return texto
          ? [{ texto, x: item.transform[4] ?? 0, y: item.transform[5] ?? 0 }]
          : [];
      });
      paginas.push({ numero, itens });
    }
  } finally {
    await documento.destroy();
  }
  return paginas;
}

function chaveErro(erro: unknown): string {
  const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido';
  if (/comprovante/i.test(mensagem)) return 'COMPROVANTE';
  if (/conta|ag[eê]ncia|cooperativa/i.test(mensagem)) return 'CONTA_NAO_DETECTADA';
  if (/per[ií]odo|vencimento/i.test(mensagem)) return 'COMPETENCIA_NAO_DETECTADA';
  if (/lançamento|compra|movimenta/i.test(mensagem)) return 'LANCAMENTOS_NAO_DETECTADOS';
  if (/layout/i.test(mensagem)) return 'LAYOUT_NAO_DETECTADO';
  return 'OUTRO';
}

async function main(): Promise<void> {
  const diretorio = resolve(
    process.argv[2] ??
      'EXTRATOS E FATURAS DE TODAS AS CONTAS DO SICOOB E SICREDI JAN A AGO2026 (1)',
  );
  const arquivos = await listarPdfs(diretorio);
  const hashes = new Set<string>();
  const resultado: ResultadoValidacao = {
    aceitos: 0,
    rejeitados: 0,
    duplicados: 0,
    porLayout: {},
    lancamentosPorLayout: {},
    competenciasPorLayout: {},
    semMovimento: 0,
    totalLancamentos: 0,
    saldosDivergentes: 0,
    contasNaoDetectadas: 0,
    lancamentosFaturaComPortador: 0,
    lancamentosFaturaComFinal: 0,
    lancamentosParcelados: 0,
    fingerprintsRepetidosNoDocumento: 0,
    erros: {},
  };

  for (const caminho of arquivos) {
    try {
      const paginas = await extrairPaginas(caminho);
      const parseado = previewImportacaoFinanceiraSchema.parse(
        parseDocumentoFinanceiro({
          conteudo: { paginas },
          arquivoNome: basename(caminho),
        }),
      );
      if (hashes.has(parseado.sha256)) {
        resultado.duplicados += 1;
        continue;
      }
      hashes.add(parseado.sha256);
      resultado.aceitos += 1;
      resultado.porLayout[parseado.layout] = (resultado.porLayout[parseado.layout] ?? 0) + 1;
      resultado.lancamentosPorLayout[parseado.layout] =
        (resultado.lancamentosPorLayout[parseado.layout] ?? 0) + parseado.lancamentos.length;
      const competencia = `${parseado.competenciaAno}-${String(parseado.competenciaMes).padStart(2, '0')}`;
      const competencias = resultado.competenciasPorLayout[parseado.layout] ?? [];
      if (!competencias.includes(competencia)) competencias.push(competencia);
      resultado.competenciasPorLayout[parseado.layout] = competencias.sort();
      if (parseado.lancamentos.length === 0) resultado.semMovimento += 1;
      resultado.totalLancamentos += parseado.lancamentos.length;
      resultado.fingerprintsRepetidosNoDocumento +=
        parseado.lancamentos.length -
        new Set(parseado.lancamentos.map((item) => item.fingerprint)).size;
      if (parseado.validacaoSaldo.status === 'DIVERGENTE') resultado.saldosDivergentes += 1;
      if (!parseado.contaDetectada) resultado.contasNaoDetectadas += 1;
      if (parseado.tipoDocumento === 'FATURA') {
        resultado.lancamentosFaturaComPortador += parseado.lancamentos.filter(
          (item) => item.portadorNome,
        ).length;
        resultado.lancamentosFaturaComFinal += parseado.lancamentos.filter(
          (item) => item.cartaoFinal,
        ).length;
        resultado.lancamentosParcelados += parseado.lancamentos.filter(
          (item) => item.parcelaNumero && item.parcelaTotal,
        ).length;
      }
    } catch (erro) {
      resultado.rejeitados += 1;
      const chave = chaveErro(erro);
      resultado.erros[chave] = (resultado.erros[chave] ?? 0) + 1;
    }
  }

  console.log(JSON.stringify({ total: arquivos.length, ...resultado }, null, 2));
}

void main();
