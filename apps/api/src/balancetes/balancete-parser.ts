import type { NaturezaConta, TipoLinhaBalancete } from '@sindprf/types';

const MONEY_RE = /\d{1,3}(?:\.\d{3})*,\d{2}/g;
/** O pdfjs às vezes quebra dígitos ("31/05/202 6"), por isso os espaços opcionais. */
const DATA_FONTE = String.raw`(\d\s?\d)\s?\/\s?(\d\s?\d)\s?\/\s?(\d\s?\d\s?\d\s?\d)`;
const PERIODO_RE = new RegExp(
  String.raw`Per[ií]odo\s*(?:de\s*)?:?\s*${DATA_FONTE}\s*(?:a|at[eé]|à|-)\s*${DATA_FONTE}`,
  'i',
);
const CODE_LINE_RE = /^(\d+(?:\.\d+)*)\s+(.+)$/;
const CODE_ONLY_RE = /^\d+(?:\.\d+)*$/;
const MONEY_ONLY_RE = /^\d{1,3}(?:\.\d{3})*,\d{2}$/;

export type LinhaBalanceteParseada = {
  codigoConta: string;
  descricao: string;
  nivel: number;
  tipo: TipoLinhaBalancete;
  natureza: NaturezaConta | null;
  saldoAnterior: number;
  debitos: number;
  creditos: number;
  saldoAtual: number;
  movimento: number;
  categoriaSlug: string | null;
  categoriaNome: string | null;
  ehFolha: boolean;
};

export type BalanceteParseado = {
  competenciaAno: number;
  competenciaMes: number;
  linhas: LinhaBalanceteParseada[];
  totalReceitas: number;
  totalDespesas: number;
  resultado: number;
};

function parseBr(valor: string): number {
  return Number(valor.replace(/\./g, '').replace(',', '.'));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function tipoPorCodigo(codigo: string): TipoLinhaBalancete {
  if (codigo === '1' || codigo.startsWith('1.')) return 'ATIVO';
  if (codigo === '2' || codigo.startsWith('2.')) return 'PASSIVO';
  if (codigo.startsWith('4.01.01') || codigo.startsWith('4.01.05')) return 'RECEITA';
  if (codigo.startsWith('4.01.07') || codigo.startsWith('4.01.09')) return 'DESPESA';
  if (codigo === '4' || codigo.startsWith('4.')) return 'OUTRO';
  return 'OUTRO';
}

function categorizar(
  codigo: string,
  descricao: string,
  tipo: TipoLinhaBalancete,
  ancestrais: string[] = [],
): { slug: string; nome: string } | null {
  if (tipo === 'RECEITA') {
    if (/mensalidade/i.test(descricao)) {
      return { slug: 'mensalidades', nome: 'Mensalidades' };
    }
    if (/rendimento|aplica/i.test(descricao)) {
      return { slug: 'rendimentos-financeiros', nome: 'Rendimentos financeiros' };
    }
    return { slug: 'outras-receitas', nome: 'Outras receitas' };
  }

  if (tipo !== 'DESPESA') return null;

  if (codigo.startsWith('4.01.07.01.02') || ancestrais.some((d) => /pessoal/i.test(d))) {
    return { slug: 'pessoal', nome: 'Pessoal' };
  }
  if (codigo.startsWith('4.01.09') || ancestrais.some((d) => /financeir/i.test(d))) {
    return { slug: 'despesas-financeiras', nome: 'Despesas financeiras' };
  }

  const d = descricao.toLowerCase();
  const regras: Array<{ keys: string[]; slug: string; nome: string }> = [
    {
      keys: ['federa', 'repasses', 'contribui'],
      slug: 'contribuicoes-repasses',
      nome: 'Contribuições e repasses',
    },
    {
      keys: ['festa', 'evento', 'comemora', 'brinde', 'jogos'],
      slug: 'eventos',
      nome: 'Eventos e confraternizações',
    },
    {
      keys: ['juríd', 'jurid', 'advogad', 'cartór', 'legal', 'gru judicial'],
      slug: 'juridico',
      nome: 'Jurídico',
    },
    {
      keys: ['ajuda de custo', 'viagen', 'diária', 'diaria'],
      slug: 'viagens-ajudas',
      nome: 'Viagens e ajudas de custo',
    },
    {
      keys: ['energia', 'água', 'agua', 'telefone', 'internet', 'esgoto'],
      slug: 'utilidades',
      nome: 'Utilidades',
    },
    {
      keys: ['manuten', 'conserv', 'limpeza', 'veículo', 'veiculo', 'máquina', 'maquina'],
      slug: 'manutencao',
      nome: 'Manutenção e conservação',
    },
    {
      keys: ['aliment', 'lanche', 'água mineral', 'agua mineral'],
      slug: 'alimentacao',
      nome: 'Alimentação',
    },
    {
      keys: ['propaganda', 'publicidade', 'gráfico', 'grafico', 'marketing'],
      slug: 'comunicacao',
      nome: 'Comunicação',
    },
    {
      keys: ['software', 'informát', 'informat', 'cert.'],
      slug: 'ti',
      nome: 'TI',
    },
    {
      keys: ['contábil', 'contabil'],
      slug: 'contabil',
      nome: 'Contábil',
    },
    {
      keys: [
        'benefício',
        'beneficio',
        'auxilio',
        'auxílio',
        'associado',
        'sindicalizado',
        'natalidade',
        'funeral',
        'totalpass',
      ],
      slug: 'beneficios-associados',
      nome: 'Benefícios a associados',
    },
    {
      keys: ['deprecia'],
      slug: 'depreciacao',
      nome: 'Depreciação',
    },
    {
      keys: [
        'locação',
        'locacao',
        'combust',
        'estacion',
        'dpvat',
        'seguro',
        'material',
        'equipamento',
        'assinatura',
      ],
      slug: 'operacional',
      nome: 'Operacional / administrativo',
    },
  ];

  for (const regra of regras) {
    if (regra.keys.some((k) => d.includes(k))) {
      return { slug: regra.slug, nome: regra.nome };
    }
  }

  return { slug: 'outras-despesas', nome: 'Outras despesas operacionais' };
}

function movimentoDoMes(
  tipo: TipoLinhaBalancete,
  debitos: number,
  creditos: number,
): number {
  if (tipo === 'RECEITA') return round2(creditos - debitos);
  if (tipo === 'DESPESA') return round2(debitos - creditos);
  return round2(creditos - debitos);
}

function saldoComSinal(valor: number, natureza: NaturezaConta | null): number {
  return natureza === 'C' ? -valor : valor;
}

/**
 * Layout Fortes com códigos reduzidos (sem pontos): a hierarquia só existe na ordem das
 * linhas. Uma conta é pai quando as contas seguintes somam exatamente seu saldo anterior,
 * débitos e créditos.
 */
function inferirHierarquia(contas: ContaLida[]): NoConta[] {
  const nos: NoConta[] = contas.map((conta) => ({ conta, pai: null, nivel: 1, ehFolha: true }));
  const fimDaSubarvore = new Map<number, number>();

  function fechar(indice: number): number {
    const memorizado = fimDaSubarvore.get(indice);
    if (memorizado !== undefined) return memorizado;

    const alvo = contas[indice] as ContaLida;
    const alvoAnterior = saldoComSinal(alvo.saldoAnterior, alvo.naturezaAnterior);
    let debitos = 0;
    let creditos = 0;
    let anterior = 0;
    const filhos: number[] = [];
    let proximo = indice + 1;
    const fechou = () =>
      round2(debitos) === round2(alvo.debitos) &&
      round2(creditos) === round2(alvo.creditos) &&
      round2(anterior) === round2(alvoAnterior);

    while (proximo < contas.length && !(filhos.length > 0 && fechou())) {
      const filho = contas[proximo] as ContaLida;
      debitos += filho.debitos;
      creditos += filho.creditos;
      anterior += saldoComSinal(filho.saldoAnterior, filho.naturezaAnterior);
      if (round2(debitos) > round2(alvo.debitos) || round2(creditos) > round2(alvo.creditos)) break;
      filhos.push(proximo);
      proximo = fechar(proximo);
    }

    const ehPai = filhos.length > 0 && fechou();
    const fim = ehPai ? proximo : indice + 1;
    if (ehPai) {
      const no = nos[indice] as NoConta;
      no.ehFolha = false;
      for (const filho of filhos) (nos[filho] as NoConta).pai = no;
    }
    fimDaSubarvore.set(indice, fim);
    return fim;
  }

  for (let indice = 0; indice < contas.length; indice = fechar(indice));
  for (const no of nos) {
    let nivel = 1;
    for (let pai = no.pai; pai; pai = pai.pai) nivel += 1;
    no.nivel = nivel;
  }
  return nos;
}

function tipoPorHierarquia(no: NoConta): TipoLinhaBalancete {
  let raiz = no;
  while (raiz.pai) raiz = raiz.pai;
  const descricaoRaiz = raiz.conta.descricao.toUpperCase();
  if (/^ATIVO/.test(descricaoRaiz)) return 'ATIVO';
  if (/^(PASSIVO|PATRIM)/.test(descricaoRaiz)) return 'PASSIVO';

  const { natureza, debitos, creditos } = no.conta;
  if (natureza) return natureza === 'C' ? 'RECEITA' : 'DESPESA';
  return creditos > debitos ? 'RECEITA' : 'DESPESA';
}

function descricoesAncestrais(no: NoConta): string[] {
  const descricoes: string[] = [];
  for (let pai = no.pai; pai; pai = pai.pai) descricoes.push(pai.conta.descricao);
  return descricoes;
}

function marcarFolhas(linhas: LinhaBalanceteParseada[]): void {
  const codigos = linhas.map((l) => l.codigoConta);
  for (const linha of linhas) {
    const prefixo = `${linha.codigoConta}.`;
    linha.ehFolha = !codigos.some((c) => c.startsWith(prefixo));
  }
}

type ContaLida = Omit<
  LinhaBalanceteParseada,
  'ehFolha' | 'movimento' | 'categoriaSlug' | 'categoriaNome' | 'tipo' | 'nivel'
> & { naturezaAnterior: NaturezaConta | null };

type NoConta = {
  conta: ContaLida;
  pai: NoConta | null;
  nivel: number;
  ehFolha: boolean;
};

/** Extrai descrição + 4 valores monetários, tolerando D/C em qualquer posição. */
function parseLinhaConta(linhaTexto: string): ContaLida | null {
  const m = CODE_LINE_RE.exec(linhaTexto.trim());
  if (!m?.[1] || !m[2]) return null;

  const codigoConta = m[1];
  const resto = m[2].trim();
  const moneyMatches = [...resto.matchAll(MONEY_RE)];
  if (moneyMatches.length < 4) return null;

  const last4 = moneyMatches.slice(-4);
  const primeiro = last4[0];
  const segundo = last4[1];
  const terceiro = last4[2];
  const quarto = last4[3];
  if (!primeiro?.[0] || !segundo?.[0] || !terceiro?.[0] || !quarto?.[0]) return null;

  const inicioValores = primeiro.index ?? 0;
  let descricao = resto.slice(0, inicioValores).trim();
  descricao = descricao.replace(/\s+[DC]\s*$/i, '').trim();
  if (!descricao || /^\*+$/.test(descricao.replace(/\s/g, ''))) {
    descricao = resto.slice(0, inicioValores).replace(/\s+[DC]\s*$/i, '').trim() || descricao;
  }
  if (!descricao) return null;

  const blocoValores = resto.slice(inicioValores);
  const naturezas = [...blocoValores.matchAll(/(?:,\d{2}\s?|\b)([DC])\b/g)].map(
    (n) => n[1] as NaturezaConta,
  );
  const fimPrimeiro = inicioValores + primeiro[0].length;
  const naturezaAnterior = /^\s?([DC])\b/.exec(resto.slice(fimPrimeiro))?.[1] as
    | NaturezaConta
    | undefined;

  return {
    codigoConta,
    descricao: descricao.replace(/\s+/g, ' '),
    natureza: naturezas.at(-1) ?? null,
    naturezaAnterior: naturezaAnterior ?? null,
    saldoAnterior: parseBr(primeiro[0]),
    debitos: parseBr(segundo[0]),
    creditos: parseBr(terceiro[0]),
    saldoAtual: parseBr(quarto[0]),
  };
}

function montarLinhasTexto(normalizado: string): string[] {
  const bruto = normalizado
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const linhasTexto: string[] = [];
  let buffer = '';

  for (const pedaco of bruto) {
    if (
      /^(Balancete|Empresa|ADMIN|Fortes|KAREN|Licenciado|Pag\.|Continua|Fim|quinta|Saldo Conta|Conta Descri)/i.test(
        pedaco,
      )
    ) {
      continue;
    }

    const iniciaConta =
      CODE_ONLY_RE.test(pedaco) || /^\d+(?:\.\d+)*\s+\S/.test(pedaco);

    if (iniciaConta) {
      if (buffer) linhasTexto.push(buffer.trim());
      buffer = pedaco;
      continue;
    }

    if (buffer) {
      if (pedaco === 'D' || pedaco === 'C' || MONEY_ONLY_RE.test(pedaco)) {
        buffer = `${buffer} ${pedaco}`;
      } else if (parseLinhaConta(buffer)) {
        linhasTexto.push(buffer.trim());
        buffer = pedaco;
      } else {
        buffer = `${buffer} ${pedaco}`;
      }
      continue;
    }

    buffer = pedaco;
  }

  if (buffer) linhasTexto.push(buffer.trim());
  return linhasTexto;
}

function montarLinha(
  conta: ContaLida,
  dados: Pick<LinhaBalanceteParseada, 'tipo' | 'nivel' | 'ehFolha'> & {
    categoria: { slug: string; nome: string } | null;
  },
): LinhaBalanceteParseada {
  const { naturezaAnterior: _naturezaAnterior, ...base } = conta;
  return {
    ...base,
    tipo: dados.tipo,
    nivel: dados.nivel,
    ehFolha: dados.ehFolha,
    movimento: movimentoDoMes(dados.tipo, conta.debitos, conta.creditos),
    categoriaSlug: dados.categoria?.slug ?? null,
    categoriaNome: dados.categoria?.nome ?? null,
  };
}

/** Layout com plano de contas pontuado (ex.: 4.01.07.01.02). */
function linhasPorCodigo(contas: ContaLida[]): LinhaBalanceteParseada[] {
  const linhas = contas.map((conta) => {
    const tipo = tipoPorCodigo(conta.codigoConta);
    return montarLinha(conta, {
      tipo,
      nivel: conta.codigoConta.split('.').length,
      ehFolha: false,
      categoria: categorizar(conta.codigoConta, conta.descricao, tipo),
    });
  });
  marcarFolhas(linhas);
  return linhas;
}

/** Layout com códigos reduzidos (ex.: 1047): hierarquia inferida pelos valores. */
function linhasPorHierarquia(contas: ContaLida[]): LinhaBalanceteParseada[] {
  return inferirHierarquia(contas).map((no) => {
    const tipo = tipoPorHierarquia(no);
    return montarLinha(no.conta, {
      tipo,
      nivel: no.nivel,
      ehFolha: no.ehFolha,
      categoria: categorizar(no.conta.codigoConta, no.conta.descricao, tipo, descricoesAncestrais(no)),
    });
  });
}

/**
 * Aceita texto com uma conta por linha (pdfjs agrupado por Y) ou campos em linhas
 * separadas. Normaliza e parseia o plano Fortes.
 */
export function parseTextoBalancete(texto: string): BalanceteParseado {
  const normalizado = texto
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();

  if (!normalizado) {
    throw new Error('Texto do balancete vazio');
  }

  const periodo = PERIODO_RE.exec(normalizado);
  if (!periodo) {
    throw new Error(
      'Não foi possível identificar o período do balancete (esperado "Período: DD/MM/AAAA a DD/MM/AAAA")',
    );
  }

  const numeroDoGrupo = (indice: number) => Number((periodo[indice] ?? '').replace(/\s/g, ''));
  const mesInicio = numeroDoGrupo(2);
  const anoInicio = numeroDoGrupo(3);
  const mesFim = numeroDoGrupo(5);
  const anoFim = numeroDoGrupo(6);
  if (mesInicio !== mesFim || anoInicio !== anoFim) {
    throw new Error('Balancete deve cobrir um único mês de competência');
  }

  const contas: ContaLida[] = [];
  const vistos = new Set<string>();
  for (const linhaTexto of montarLinhasTexto(normalizado)) {
    const conta = parseLinhaConta(linhaTexto);
    if (!conta) continue;
    // PDF pode repetir cabeçalhos/contas entre páginas; mantém a primeira ocorrência.
    if (vistos.has(conta.codigoConta)) continue;
    vistos.add(conta.codigoConta);
    contas.push(conta);
  }

  if (contas.length < 10) {
    throw new Error('Poucas contas reconhecidas no balancete — verifique o PDF');
  }

  const codigosReduzidos = contas.every((conta) => !conta.codigoConta.includes('.'));
  const linhas = codigosReduzidos ? linhasPorHierarquia(contas) : linhasPorCodigo(contas);

  let totalReceitas = 0;
  let totalDespesas = 0;
  for (const linha of linhas) {
    if (!linha.ehFolha) continue;
    if (linha.tipo === 'RECEITA') totalReceitas += linha.movimento;
    if (linha.tipo === 'DESPESA') totalDespesas += linha.movimento;
  }
  totalReceitas = round2(totalReceitas);
  totalDespesas = round2(totalDespesas);

  return {
    competenciaAno: anoInicio,
    competenciaMes: mesInicio,
    linhas,
    totalReceitas,
    totalDespesas,
    resultado: round2(totalReceitas - totalDespesas),
  };
}
