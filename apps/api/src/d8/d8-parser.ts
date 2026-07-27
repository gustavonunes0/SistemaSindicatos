export type LinhaD8Parseada = {
  sequencia: number;
  matricula: string;
  nome: string;
  cpf: string;
  descricao: string;
  valor: number;
};

export type D8Parseado = {
  competenciaAno: number;
  competenciaMes: number;
  linhas: LinhaD8Parseada[];
  totalValor: number;
};

const COMPETENCIA_RE = /M[eê]s\/Ano:\s*(\d{2})\/(\d{4})/i;
const LINHA_RE =
  /(\d+)\s+(\d+)\s+(.+?)\s+(Mensalidade(?:\s+DPRF)?)\s+([\d.]+,\d{2})\s+(\d{3}\.\d{3}\.\d{3}-\d{2})/gi;

export function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export function parseValorBr(valor: string): number {
  return Number(valor.replace(/\./g, '').replace(',', '.'));
}

export function parseTextoD8(texto: string): D8Parseado {
  const normalizado = texto.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
  const competencia = normalizado.match(COMPETENCIA_RE);
  if (!competencia) {
    throw new Error('Não foi possível identificar Mês/Ano no PDF D8');
  }

  const competenciaMes = Number(competencia[1]);
  const competenciaAno = Number(competencia[2]);
  if (competenciaMes < 1 || competenciaMes > 12) {
    throw new Error('Competência inválida no PDF D8');
  }

  const linhas: LinhaD8Parseada[] = [];
  const vistos = new Set<string>();

  for (const match of normalizado.matchAll(LINHA_RE)) {
    const sequenciaRaw = match[1];
    const matricula = match[2];
    const nomeRaw = match[3];
    const descricaoRaw = match[4];
    const valorRaw = match[5];
    const cpfRaw = match[6];
    if (!sequenciaRaw || !matricula || !nomeRaw || !descricaoRaw || !valorRaw || !cpfRaw) {
      continue;
    }

    const sequencia = Number(sequenciaRaw);
    const nome = nomeRaw.trim();
    const descricao = descricaoRaw.replace(/\s+/g, ' ').trim();
    const valor = parseValorBr(valorRaw);
    const cpf = normalizarCpf(cpfRaw);

    if (!Number.isFinite(valor) || cpf.length !== 11 || !nome) continue;

    const chave = `${cpf}:${matricula}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    linhas.push({ sequencia, matricula, nome, cpf, descricao, valor });
  }

  if (linhas.length === 0) {
    throw new Error('Nenhuma linha de desconto D8 encontrada no PDF');
  }

  linhas.sort((a, b) => a.sequencia - b.sequencia);
  const totalValor = Math.round(linhas.reduce((acc, l) => acc + l.valor, 0) * 100) / 100;

  return { competenciaAno, competenciaMes, linhas, totalValor };
}
