import { createHash } from 'node:crypto';
import type {
  CadastrarContaFinanceira,
  ConteudoDocumentoFinanceiro,
  InstituicaoFinanceira,
  LancamentoFinanceiroPreview,
  PreviewImportacaoFinanceira,
  StatusValidacaoSaldo,
  TipoDocumentoFinanceiro,
  TipoLancamentoFinanceiro,
  ValidacaoSaldoFinanceiro,
} from '@sindprf/types';

type ResultadoLayout = Omit<PreviewImportacaoFinanceira, 'arquivoNome' | 'sha256'>;
type ConfiguracaoLayout = {
  instituicao: InstituicaoFinanceira;
  tipoDocumento: TipoDocumentoFinanceiro;
  layout: string;
};
type DadosCartao = {
  portadorNome: string | null;
  cartaoFinal: string | null;
};

const CONFIGURACOES: ConfiguracaoLayout[] = [
  { instituicao: 'SICOOB', tipoDocumento: 'EXTRATO', layout: 'SICOOB_EXTRATO' },
  { instituicao: 'SICOOB', tipoDocumento: 'FATURA', layout: 'SICOOB_FATURA' },
  { instituicao: 'SICREDI', tipoDocumento: 'EXTRATO', layout: 'SICREDI_EXTRATO' },
  { instituicao: 'SICREDI', tipoDocumento: 'FATURA', layout: 'SICREDI_FATURA' },
];
const MESES: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  março: 3,
  abr: 4,
  abril: 4,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
};
const DATA_COMPLETA_RE = /(\d{2})\/(\d{2})\/(\d{4})/;
const VALOR_FONTE = String.raw`-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}\s*[CD*]?`;
const DOCUMENTO_RE =
  /\b(?:CPF|CNPJ)?\s*:?\s*(\d{11}|\d{14}|\d{3}[.\s]\d{3}[.\s]\d{3}[-\s]\d{2}|\d{2}[.\s]\d{3}[.\s]\d{3}[/\s]\d{4}[-\s]\d{2})\b/i;

function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function hash(valor: string): string {
  return createHash('sha256').update(valor, 'utf8').digest('hex');
}

function parseValor(valor: string): number {
  const negativo = /^\s*-/.test(valor) || /D\s*\*?\s*$/i.test(valor);
  const numero = Number(
    valor
      .replace(/[CD*]/gi, '')
      .replace(/[^\d,-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.'),
  );
  return arredondar(Math.abs(numero) * (negativo ? -1 : 1));
}

function valoresDaLinha(linha: string): string[] {
  return [...linha.matchAll(new RegExp(VALOR_FONTE, 'gi'))].map((item) => item[0].trim());
}

function sanitizarDocumento(valor: string | undefined): string | null {
  if (!valor) return null;
  const digitos = valor.replace(/\D/g, '');
  return digitos.length === 11 || digitos.length === 14 ? digitos : null;
}

function mascararDocumento(valor: string): string {
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length === 11) {
    return `***.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-**`;
  }
  if (digitos.length === 14) {
    return `**.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/****-${digitos.slice(12)}`;
  }
  return valor;
}

function mascararDocumentosNoTexto(texto: string): string {
  return texto.replace(new RegExp(DOCUMENTO_RE.source, 'gi'), (ocorrencia) => {
    const documento = sanitizarDocumento(ocorrencia);
    return documento ? mascararDocumento(documento) : ocorrencia;
  });
}

function dataUtc(dia: number, mes: number, ano: number): Date {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    throw new Error('Data inválida no documento financeiro');
  }
  return data;
}

function parseDataCompleta(valor: string): Date {
  const match = DATA_COMPLETA_RE.exec(valor);
  if (!match?.[1] || !match[2] || !match[3]) throw new Error('Data completa inválida');
  return dataUtc(Number(match[1]), Number(match[2]), Number(match[3]));
}

function mesPorNome(nome: string): number | undefined {
  return MESES[nome.toLocaleLowerCase('pt-BR')];
}

function textoDoConteudo(conteudo: ConteudoDocumentoFinanceiro): string {
  if (conteudo.texto?.trim()) return conteudo.texto.replace(/\r\n?/g, '\n').trim();
  return [...(conteudo.paginas ?? [])]
    .sort((a, b) => a.numero - b.numero)
    .map((pagina) => {
      if (pagina.texto?.trim()) return pagina.texto.trim();
      const itens = [...(pagina.itens ?? [])].sort((a, b) => {
        const diferencaY = (b.y ?? 0) - (a.y ?? 0);
        return Math.abs(diferencaY) > 2.5 ? diferencaY : (a.x ?? 0) - (b.x ?? 0);
      });
      const linhas: Array<{ y: number; textos: string[] }> = [];
      for (const item of itens) {
        const y = item.y ?? linhas.at(-1)?.y ?? 0;
        const atual = linhas.at(-1);
        if (!atual || Math.abs(atual.y - y) > 2.5) linhas.push({ y, textos: [item.texto] });
        else atual.textos.push(item.texto);
      }
      return linhas.map((linha) => linha.textos.join(' ').replace(/\s+/g, ' ').trim()).join('\n');
    })
    .join('\n');
}

function normalizarIdentificador(valor: string): string {
  return valor.replace(/\s/g, '').replace(/[^\dA-Za-z-]/g, '');
}

function nomeSugeridoConta(
  instituicao: InstituicaoFinanceira,
  numero: string,
): string {
  const nomesConhecidos: Record<string, string> = {
    'SICREDI:02857-6': 'Principal',
    'SICREDI:02938-6': 'Fundo complementar',
    'SICREDI:02978-5': 'Convênios',
    'SICREDI:02982-3': 'Social',
  };
  return nomesConhecidos[`${instituicao}:${numero}`] ?? `Conta ${numero}`;
}

function extrairConta(
  texto: string,
  instituicao: InstituicaoFinanceira,
): CadastrarContaFinanceira | null {
  const agencia =
    /(?:Ag[eê]ncia(?:\/Cooperativa)?|Cooperativa)\s*[:-]?\s*([\d.-]+)/i.exec(texto)?.[1];
  const conta =
    /Conta(?:\s+(?:corrente|cart[aã]o|origem))?\s*[:-]?\s*([\d.-]+)/i.exec(texto)?.[1] ??
    /Conta\s+(\d{3,}[-\s]\d)/i.exec(texto)?.[1];
  if (!agencia || !conta) return null;

  const numero = normalizarIdentificador(conta);
  const titularNome =
    /(?:Titular|Cliente|Associado)\s*[:-]\s*([^\n]+)/i.exec(texto)?.[1]?.trim() ?? undefined;
  const titularDocumento = sanitizarDocumento(DOCUMENTO_RE.exec(texto)?.[1]);
  return {
    instituicao,
    agencia: normalizarIdentificador(agencia),
    numero,
    nome: nomeSugeridoConta(instituicao, numero),
    ...(titularNome ? { titularNome } : {}),
    ...(titularDocumento ? { titularDocumento } : {}),
  };
}

function fingerprintLancamento(input: Omit<LancamentoFinanceiroPreview, 'fingerprint'>) {
  return hash(
    [
      input.sequencia,
      input.data.toISOString().slice(0, 10),
      input.descricao.toUpperCase().replace(/\s+/g, ' ').trim(),
      input.documento ?? '',
      input.tipo,
      input.valor.toFixed(2),
      input.saldoApos?.toFixed(2) ?? '',
      input.cartaoFinal ?? '',
      input.parcelaNumero ?? '',
      input.parcelaTotal ?? '',
    ].join('|'),
  );
}

function montarLancamento(input: {
  sequencia: number;
  data: Date;
  descricao: string;
  tipo: TipoLancamentoFinanceiro;
  valor: number;
  saldoApos?: number | null;
  documento?: string | null;
  portadorNome?: string | null;
  cartaoFinal?: string | null;
  parcelaNumero?: number | null;
  parcelaTotal?: number | null;
}): LancamentoFinanceiroPreview {
  const descricaoOriginal = input.descricao.replace(/\s+/g, ' ').trim();
  const documentoContraparte = sanitizarDocumento(DOCUMENTO_RE.exec(descricaoOriginal)?.[1]);
  const descricao = mascararDocumentosNoTexto(descricaoOriginal);
  const base = {
    data: input.data,
    descricao,
    documento: input.documento ?? null,
    tipo: input.tipo,
    valor: arredondar(Math.abs(input.valor)),
    saldoApos: input.saldoApos ?? null,
    contraparteNome: null,
    contraparteDocumento: documentoContraparte
      ? mascararDocumento(documentoContraparte)
      : null,
    portadorNome: input.portadorNome ?? null,
    cartaoFinal: input.cartaoFinal ?? null,
    parcelaNumero: input.parcelaNumero ?? null,
    parcelaTotal: input.parcelaTotal ?? null,
  };
  const lancamento = { sequencia: input.sequencia, ...base };
  return { ...lancamento, fingerprint: fingerprintLancamento(lancamento) };
}

function extrairPeriodo(texto: string): { inicio: Date; fim: Date } {
  const periodo =
    /Per[ií]odo[^0-9]*(\d{2}\/\d{2}\/\d{4})\s*(?:a|at[eé]|-)\s*(\d{2}\/\d{2}\/\d{4})/i.exec(
      texto,
    );
  if (!periodo?.[1] || !periodo[2]) throw new Error('Não foi possível identificar o período');
  return { inicio: parseDataCompleta(periodo[1]), fim: parseDataCompleta(periodo[2]) };
}

function valorRotulado(texto: string, rotulo: RegExp, ultimo = false): number | null {
  const linhas = texto.split('\n').filter((linha) => rotulo.test(linha));
  const linha = ultimo ? linhas.at(-1) : linhas[0];
  const valor = linha ? valoresDaLinha(linha).at(-1) : undefined;
  return valor ? parseValor(valor) : null;
}

function validarSaldo(
  saldoInicial: number | null,
  saldoFinal: number | null,
  lancamentos: LancamentoFinanceiroPreview[],
  aplicavel = true,
): ValidacaoSaldoFinanceiro {
  const totalCreditos = arredondar(
    lancamentos.filter((item) => item.tipo === 'CREDITO').reduce((soma, item) => soma + item.valor, 0),
  );
  const totalDebitos = arredondar(
    lancamentos.filter((item) => item.tipo === 'DEBITO').reduce((soma, item) => soma + item.valor, 0),
  );
  if (!aplicavel || saldoInicial === null || saldoFinal === null) {
    return {
      status: 'NAO_APLICAVEL',
      saldoInicial,
      totalCreditos,
      totalDebitos,
      saldoCalculado: null,
      saldoFinal,
      diferenca: null,
    };
  }
  const saldoCalculado = arredondar(saldoInicial + totalCreditos - totalDebitos);
  const diferenca = arredondar(saldoCalculado - saldoFinal);
  const status: StatusValidacaoSaldo = Math.abs(diferenca) <= 0.01 ? 'VALIDO' : 'DIVERGENTE';
  return {
    status,
    saldoInicial,
    totalCreditos,
    totalDebitos,
    saldoCalculado,
    saldoFinal,
    diferenca,
  };
}

function blocosPorData(linhas: string[], inicioRe: RegExp, interromperRe?: RegExp): string[] {
  const blocos: string[] = [];
  let atual = '';
  for (const linha of linhas) {
    if (interromperRe?.test(linha)) {
      if (atual) blocos.push(atual);
      break;
    }
    if (inicioRe.test(linha)) {
      if (atual) blocos.push(atual);
      atual = linha;
    } else if (atual) {
      atual = `${atual} ${linha}`;
    }
  }
  if (atual) blocos.push(atual);
  return blocos;
}

function resultadoExtrato(input: {
  texto: string;
  config: ConfiguracaoLayout;
  periodo: { inicio: Date; fim: Date };
  lancamentos: LancamentoFinanceiroPreview[];
  saldoInicial: number | null;
  saldoFinal: number | null;
}): ResultadoLayout {
  const validacaoSaldo = validarSaldo(input.saldoInicial, input.saldoFinal, input.lancamentos);
  return {
    ...input.config,
    contaDetectada: extrairConta(input.texto, input.config.instituicao),
    competenciaAno: input.periodo.fim.getUTCFullYear(),
    competenciaMes: input.periodo.fim.getUTCMonth() + 1,
    periodoInicio: input.periodo.inicio,
    periodoFim: input.periodo.fim,
    vencimento: null,
    totalDocumento: null,
    validacaoSaldo,
    lancamentos: input.lancamentos,
    avisos:
      validacaoSaldo.status === 'DIVERGENTE'
        ? ['Os saldos informados pelo documento não conciliam com os lançamentos']
        : [],
  };
}

export function parseSicoobExtrato(texto: string): ResultadoLayout {
  const config = CONFIGURACOES[0] as ConfiguracaoLayout;
  const periodo = extrairPeriodo(texto);
  const linhas = texto.split('\n').map((linha) => linha.trim()).filter(Boolean);
  const blocos = blocosPorData(linhas, /^\d{2}\/\d{2}\b/, /^RESUMO\b/i);
  const lancamentos: LancamentoFinanceiroPreview[] = [];

  for (const bloco of blocos) {
    if (/\bSALDO (?:ANTERIOR|BLOQUEADO|DO DIA)\b/i.test(bloco)) continue;
    const dataMatch = /^(\d{2})\/(\d{2})\b/.exec(bloco);
    const valores = valoresDaLinha(bloco);
    const valorTexto = valores.at(-1);
    if (!dataMatch?.[1] || !dataMatch[2] || !valorTexto || !/[CD]\s*$/i.test(valorTexto)) continue;
    const valor = parseValor(valorTexto);
    const semData = bloco.slice(dataMatch[0].length).trim();
    const documentoMatch = /^(\S+)\s+(.+)$/.exec(semData);
    const descricaoBruta = (documentoMatch?.[2] ?? semData).replace(valorTexto, '').trim();
    lancamentos.push(
      montarLancamento({
        sequencia: lancamentos.length + 1,
        data: dataUtc(Number(dataMatch[1]), Number(dataMatch[2]), periodo.fim.getUTCFullYear()),
        descricao: descricaoBruta,
        documento: documentoMatch?.[1] ?? null,
        tipo: valor < 0 ? 'DEBITO' : 'CREDITO',
        valor,
      }),
    );
  }

  const saldoInicial = valorRotulado(texto, /SALDO (?:ANTERIOR|INICIAL)/i);
  const saldoFinal =
    valorRotulado(texto, /^Saldo em conta:/im) ?? valorRotulado(texto, /SALDO DO DIA/i, true);
  return resultadoExtrato({ texto, config, periodo, lancamentos, saldoInicial, saldoFinal });
}

export function parseSicrediExtrato(texto: string): ResultadoLayout {
  const config = CONFIGURACOES[2] as ConfiguracaoLayout;
  const periodo = extrairPeriodo(texto);
  const linhas = texto.split('\n').map((linha) => linha.trim()).filter(Boolean);
  const lancamentos: LancamentoFinanceiroPreview[] = [];

  for (const linha of linhas) {
    const dataMatch = /^(\d{2}\/\d{2}\/\d{4})\s+(.+)$/.exec(linha);
    if (!dataMatch?.[1] || !dataMatch[2]) continue;
    const valores = valoresDaLinha(dataMatch[2]);
    if (valores.length < 2) continue;
    const valorTexto = valores.at(-2) as string;
    const saldoTexto = valores.at(-1) as string;
    const valor = parseValor(valorTexto);
    const antesValores = dataMatch[2].slice(0, dataMatch[2].indexOf(valorTexto)).trim();
    const documentoMatch = /^(.*\S)\s+(\S+)$/.exec(antesValores);
    lancamentos.push(
      montarLancamento({
        sequencia: lancamentos.length + 1,
        data: parseDataCompleta(dataMatch[1]),
        descricao: documentoMatch?.[1] ?? antesValores,
        documento: documentoMatch?.[2] ?? null,
        tipo: valor < 0 ? 'DEBITO' : 'CREDITO',
        valor,
        saldoApos: parseValor(saldoTexto),
      }),
    );
  }

  const saldoInicial = valorRotulado(texto, /SALDO (?:ANTERIOR|INICIAL)/i);
  const saldoFinal = lancamentos.at(-1)?.saldoApos ?? saldoInicial;
  return resultadoExtrato({ texto, config, periodo, lancamentos, saldoInicial, saldoFinal });
}

function extrairCompetenciaFatura(texto: string, vencimento: Date): { ano: number; mes: number } {
  const nome = /(?:Total\s+)?[Ff]atura de\s+([A-Za-zÀ-ÿ]+)/i.exec(texto)?.[1];
  return {
    ano: vencimento.getUTCFullYear(),
    mes: (nome ? mesPorNome(nome) : undefined) ?? vencimento.getUTCMonth() + 1,
  };
}

function extrairVencimento(texto: string): Date {
  const completo = /Vencimento\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i.exec(texto)?.[1];
  if (completo) return parseDataCompleta(completo);
  const curto = /Vencimento\s*:?\s*(\d{2})\/([A-Za-zÀ-ÿ]{3,})/i.exec(texto);
  const ano =
    /(?:Fechamento[^0-9]*|em\s+)(?:\d{2}\/\d{2}\/)(\d{4})/i.exec(texto)?.[1] ??
    [...texto.matchAll(/\/(\d{4})\b/g)].map((item) => item[1]).find(Boolean);
  const mes = curto?.[2] ? mesPorNome(curto[2]) : undefined;
  if (!curto?.[1] || !mes || !ano) throw new Error('Não foi possível identificar o vencimento');
  return dataUtc(Number(curto[1]), mes, Number(ano));
}

function dadosCartaoDoCabecalho(linha: string): DadosCartao | null {
  const match = /^Cart[aã]o(?:\s+portador)?(?:\s+virtual)?\s+(.+?)\s+\([^)]*?(\d{4})\)/i.exec(
    linha,
  );
  if (!match?.[1] || !match[2]) return null;
  return {
    portadorNome: match[1].replace(/[^\p{L}\s.'-]/gu, '').replace(/\s+/g, ' ').trim(),
    cartaoFinal: match[2],
  };
}

function parcelaDaDescricao(descricao: string): {
  parcelaNumero: number | null;
  parcelaTotal: number | null;
} {
  const parcelas = [...descricao.matchAll(/\b(\d{2})\/(\d{2})\b/g)];
  const match = parcelas.at(-1);
  if (!match?.[1] || !match[2]) return { parcelaNumero: null, parcelaTotal: null };
  return { parcelaNumero: Number(match[1]), parcelaTotal: Number(match[2]) };
}

function dataFaturaNumerica(data: string, vencimento: Date): Date {
  const [dia, mes] = data.split('/').map(Number);
  if (!dia || !mes) throw new Error('Data de lançamento inválida');
  let ano = vencimento.getUTCFullYear();
  if (mes > vencimento.getUTCMonth() + 2) ano -= 1;
  return dataUtc(dia, mes, ano);
}

function dataFaturaNomeada(dia: string, mesNome: string, vencimento: Date): Date {
  const mes = mesPorNome(mesNome);
  if (!mes) throw new Error('Mês de lançamento inválido');
  let ano = vencimento.getUTCFullYear();
  if (mes > vencimento.getUTCMonth() + 2) ano -= 1;
  return dataUtc(Number(dia), mes, ano);
}

function resultadoFatura(input: {
  texto: string;
  config: ConfiguracaoLayout;
  vencimento: Date;
  lancamentos: LancamentoFinanceiroPreview[];
}): ResultadoLayout {
  const competencia = extrairCompetenciaFatura(input.texto, input.vencimento);
  const totalDocumento = valorRotulado(input.texto, /Total (?:desta |da )?[Ff]atura/i);
  const validacaoSaldo = validarSaldo(null, null, input.lancamentos, false);
  const datas = input.lancamentos.map((item) => item.data.getTime());
  const inicio =
    datas.length > 0
      ? new Date(Math.min(...datas))
      : dataUtc(1, competencia.mes, competencia.ano);
  const fim =
    datas.length > 0
      ? new Date(Math.max(...datas))
      : new Date(Date.UTC(competencia.ano, competencia.mes, 0));
  return {
    ...input.config,
    contaDetectada: extrairConta(input.texto, input.config.instituicao),
    competenciaAno: competencia.ano,
    competenciaMes: competencia.mes,
    periodoInicio: inicio,
    periodoFim: fim,
    vencimento: input.vencimento,
    totalDocumento: totalDocumento === null ? null : Math.abs(totalDocumento),
    validacaoSaldo,
    lancamentos: input.lancamentos,
    avisos: [],
  };
}

export function parseSicoobFatura(texto: string): ResultadoLayout {
  const config = CONFIGURACOES[1] as ConfiguracaoLayout;
  const vencimento = extrairVencimento(texto);
  const linhas = texto.split('\n').map((linha) => linha.trim()).filter(Boolean);
  const lancamentos: LancamentoFinanceiroPreview[] = [];
  let cartao: DadosCartao = { portadorNome: null, cartaoFinal: null };

  let blocoAtual: string | null = null;
  const processar = () => {
    if (!blocoAtual) return;
    const match = /^(\d{2}\/\d{2})\s+(.+)$/.exec(blocoAtual);
    const valorTexto = valoresDaLinha(blocoAtual).at(-1);
    if (!match?.[1] || !match[2] || !valorTexto) return;
    const descricao = match[2].replace(valorTexto, '').trim();
    const parcela = parcelaDaDescricao(descricao);
    const valor = parseValor(valorTexto);
    lancamentos.push(
      montarLancamento({
        sequencia: lancamentos.length + 1,
        data: dataFaturaNumerica(match[1], vencimento),
        descricao,
        tipo: valor < 0 ? 'CREDITO' : 'DEBITO',
        valor,
        ...cartao,
        ...parcela,
      }),
    );
  };

  for (const linha of linhas) {
    const dados = /^GASTOS DE\s+(.+?)\s+\((\d{4})\)/i.exec(linha);
    if (dados?.[1] && dados[2]) {
      processar();
      blocoAtual = null;
      cartao = { portadorNome: dados[1].trim(), cartaoFinal: dados[2] };
      continue;
    }
    if (/^\d{2}\/\d{2}\b/.test(linha)) {
      processar();
      blocoAtual = linha;
      continue;
    }
    if (blocoAtual && !/^TOTAL\b|^-+\s*ENCARGOS/i.test(linha)) blocoAtual = `${blocoAtual} ${linha}`;
    if (/^-+\s*ENCARGOS/i.test(linha)) break;
  }
  processar();
  return resultadoFatura({ texto, config, vencimento, lancamentos });
}

export function parseSicrediFatura(texto: string): ResultadoLayout {
  const config = CONFIGURACOES[3] as ConfiguracaoLayout;
  const vencimento = extrairVencimento(texto);
  const linhas = texto.split('\n').map((linha) => linha.trim()).filter(Boolean);
  const lancamentos: LancamentoFinanceiroPreview[] = [];
  let cartao: DadosCartao = { portadorNome: null, cartaoFinal: null };
  let blocoAtual: string | null = null;

  const processar = () => {
    if (!blocoAtual) return;
    const match = /^(\d{2})\/([A-Za-zÀ-ÿ]{3,})\s+\d{2}:\d{2}\s+(.+)$/.exec(blocoAtual);
    const valorTexto = valoresDaLinha(blocoAtual).at(-1);
    if (!match?.[1] || !match[2] || !match[3] || !valorTexto) return;
    const descricao = match[3].replace(valorTexto, '').trim();
    const parcela = parcelaDaDescricao(descricao);
    const valor = parseValor(valorTexto);
    lancamentos.push(
      montarLancamento({
        sequencia: lancamentos.length + 1,
        data: dataFaturaNomeada(match[1], match[2], vencimento),
        descricao,
        tipo: valor < 0 ? 'CREDITO' : 'DEBITO',
        valor,
        ...cartao,
        ...parcela,
      }),
    );
  };

  for (const linha of linhas) {
    const cabecalho = dadosCartaoDoCabecalho(linha);
    if (cabecalho) {
      processar();
      blocoAtual = null;
      cartao = cabecalho;
      continue;
    }
    if (/^\d{2}\/[A-Za-zÀ-ÿ]{3,}\s+\d{2}:\d{2}\b/.test(linha)) {
      processar();
      blocoAtual = linha;
      continue;
    }
    if (blocoAtual && !/^Total cart[aã]o|^Legenda:|^\d+ de \d+$/i.test(linha)) {
      blocoAtual = `${blocoAtual} ${linha}`;
    }
    if (/^Total cart[aã]o|^Legenda:/i.test(linha)) {
      processar();
      blocoAtual = null;
    }
  }
  processar();
  return resultadoFatura({ texto, config, vencimento, lancamentos });
}

function detectarLayout(
  texto: string,
  instituicaoInformada?: InstituicaoFinanceira,
  tipoInformado?: TipoDocumentoFinanceiro,
): ConfiguracaoLayout {
  if (
    /Autentica[cç][aã]o Eletr[oô]nica|Descri[cç][aã]o do Pagamento|comprovante de pagamento/i.test(
      texto,
    )
  ) {
    throw new Error('Comprovante de pagamento não é extrato nem fatura');
  }
  const instituicao =
    instituicaoInformada ??
    (/SICOOB|SISBR/i.test(texto) ? 'SICOOB' : /SICREDI/i.test(texto) ? 'SICREDI' : undefined);
  const tipoDocumento =
    tipoInformado ??
    (/EXTRATO DE CONTA|Extrato\s*\(Per[ií]odo|HIST[ÓO]RICO DE MOVIMENTA[ÇC][ÃA]O/i.test(texto)
      ? 'EXTRATO'
      : /FATURA|CART[AÃ]O.*final|EXTRATO DE FATURA/i.test(texto)
        ? 'FATURA'
        : 'EXTRATO');
  const config = CONFIGURACOES.find(
    (item) => item.instituicao === instituicao && item.tipoDocumento === tipoDocumento,
  );
  if (!config) throw new Error('Layout financeiro não reconhecido');
  return config;
}

export function parseDocumentoFinanceiro(input: {
  conteudo: ConteudoDocumentoFinanceiro;
  arquivoNome: string;
  instituicao?: InstituicaoFinanceira;
  tipoDocumento?: TipoDocumentoFinanceiro;
}): PreviewImportacaoFinanceira {
  const texto = textoDoConteudo(input.conteudo);
  const config = detectarLayout(texto, input.instituicao, input.tipoDocumento);
  const resultado =
    config.layout === 'SICOOB_EXTRATO'
      ? parseSicoobExtrato(texto)
      : config.layout === 'SICOOB_FATURA'
        ? parseSicoobFatura(texto)
        : config.layout === 'SICREDI_EXTRATO'
          ? parseSicrediExtrato(texto)
          : parseSicrediFatura(texto);
  return {
    ...resultado,
    arquivoNome: input.arquivoNome,
    sha256: hash(texto.replace(/\s+/g, ' ').trim()),
  };
}
