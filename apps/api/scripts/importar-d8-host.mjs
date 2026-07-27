/**
 * Carga D8 via Prisma no host (sem Nest), útil quando o container não alcança o DB.
 * Uso (na pasta apps/api): node --env-file=.env scripts/importar-d8-host.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import bcrypt from 'bcrypt';

const require = createRequire(import.meta.url);
const { PrismaClient, Prisma } = require('@prisma/client');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '../../..');
const prisma = new PrismaClient();
const LOTE = 100;
const SENHA = process.env.D8_SENHA_TEMP ?? 'Sindprf@D8';

const COMPETENCIA_RE = /M[eê]s\/Ano:\s*(\d{2})\/(\d{4})/i;
const LINHA_RE =
  /(\d+)\s+(\d+)\s+(.+?)\s+(Mensalidade(?:\s+DPRF)?)\s+([\d.]+,\d{2})\s+(\d{3}\.\d{3}\.\d{3}-\d{2})/gi;

function parseTextoD8(texto) {
  const normalizado = texto.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
  const competencia = normalizado.match(COMPETENCIA_RE);
  if (!competencia) throw new Error('Competência não encontrada');
  const competenciaMes = Number(competencia[1]);
  const competenciaAno = Number(competencia[2]);
  const linhas = [];
  const vistos = new Set();
  for (const match of normalizado.matchAll(LINHA_RE)) {
    const sequencia = Number(match[1]);
    const matricula = match[2];
    const nome = match[3].trim();
    const descricao = match[4].replace(/\s+/g, ' ').trim();
    const valor = Number(match[5].replace(/\./g, '').replace(',', '.'));
    const cpf = match[6].replace(/\D/g, '');
    if (!Number.isFinite(valor) || cpf.length !== 11) continue;
    const chave = `${cpf}:${matricula}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    linhas.push({ sequencia, matricula, nome, cpf, descricao, valor });
  }
  if (!linhas.length) throw new Error('Nenhuma linha');
  linhas.sort((a, b) => a.sequencia - b.sequencia);
  const totalValor = Math.round(linhas.reduce((a, l) => a + l.valor, 0) * 100) / 100;
  return { competenciaAno, competenciaMes, linhas, totalValor };
}

async function extrairTexto(caminho) {
  const data = new Uint8Array(fs.readFileSync(caminho));
  const doc = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
  const partes = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    partes.push(content.items.map((item) => ('str' in item ? item.str : '')).filter(Boolean).join(' '));
  }
  return partes.join('\n');
}

function emLotes(itens, tamanho) {
  const out = [];
  for (let i = 0; i < itens.length; i += tamanho) out.push(itens.slice(i, i + tamanho));
  return out;
}

async function apagarAfiliados() {
  const afiliados = await prisma.afiliado.findMany({ select: { id: true, userId: true } });
  if (!afiliados.length) return;
  const afiliadoIds = afiliados.map((a) => a.id);
  const userIds = afiliados.map((a) => a.userId);
  await prisma.linhaD8.updateMany({ where: { afiliadoId: { in: afiliadoIds } }, data: { afiliadoId: null } });
  await prisma.solicitacaoAluguel.deleteMany({ where: { afiliadoId: { in: afiliadoIds } } });
  await prisma.mensagem.deleteMany({ where: { autorId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds }, role: 'AFILIADO' } });
  console.log(`Removidos ${afiliados.length} afiliados`);
}

async function sincronizar(linhas, tipo, senhaHash) {
  const cpfs = linhas.map((l) => l.cpf);
  const matriculas = linhas.map((l) => l.matricula);
  const existentes = await prisma.afiliado.findMany({
    where: { OR: [{ cpf: { in: cpfs } }, { matricula: { in: matriculas } }] },
  });
  const porCpf = new Map(existentes.map((a) => [a.cpf, a]));
  const porMatricula = new Map(existentes.map((a) => [a.matricula, a]));
  const paraAtualizar = [];
  const paraCriar = [];

  for (const linha of linhas) {
    const afiliado = porCpf.get(linha.cpf) ?? porMatricula.get(linha.matricula);
    if (afiliado) paraAtualizar.push(linha);
    else paraCriar.push(linha);
  }

  for (const lote of emLotes(paraAtualizar, LOTE)) {
    await Promise.all(
      lote.map((linha) => {
        const afiliado = porCpf.get(linha.cpf) ?? porMatricula.get(linha.matricula);
        return prisma.afiliado.update({
          where: { id: afiliado.id },
          data: {
            nome: linha.nome,
            matricula: linha.matricula,
            cpf: linha.cpf,
            categoria: tipo,
            status: 'APROVADO',
          },
        });
      }),
    );
  }

  for (const lote of emLotes(paraCriar, LOTE)) {
    await prisma.user.createMany({
      data: lote.map((linha) => ({
        email: `d8.${linha.cpf}@sindprf.local`,
        senhaHash,
        role: 'AFILIADO',
      })),
      skipDuplicates: true,
    });
    const emails = lote.map((l) => `d8.${l.cpf}@sindprf.local`);
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
    const userPorEmail = new Map(users.map((u) => [u.email, u.id]));
    await prisma.afiliado.createMany({
      data: lote.map((linha) => ({
        userId: userPorEmail.get(`d8.${linha.cpf}@sindprf.local`),
        nome: linha.nome,
        cpf: linha.cpf,
        matricula: linha.matricula,
        categoria: tipo,
        status: 'APROVADO',
      })),
      skipDuplicates: true,
    });
  }

  return { criados: paraCriar.length, vinculados: paraAtualizar.length + paraCriar.length };
}

async function importarArquivo({ caminho, tipo, substituirBase }) {
  console.log(`\n==> ${tipo} ${path.basename(caminho)}`);
  const texto = await extrairTexto(caminho);
  const parseado = parseTextoD8(texto);
  console.log(`Linhas: ${parseado.linhas.length} · Total: ${parseado.totalValor}`);

  const senhaHash = await bcrypt.hash(SENHA, 10);
  if (substituirBase) await apagarAfiliados();

  const existente = await prisma.importacaoD8.findUnique({
    where: {
      competenciaAno_competenciaMes_tipo: {
        competenciaAno: parseado.competenciaAno,
        competenciaMes: parseado.competenciaMes,
        tipo,
      },
    },
  });
  if (existente) {
    await prisma.linhaD8.deleteMany({ where: { importacaoId: existente.id } });
    await prisma.importacaoD8.delete({ where: { id: existente.id } });
  }

  const importacao = await prisma.importacaoD8.create({
    data: {
      competenciaAno: parseado.competenciaAno,
      competenciaMes: parseado.competenciaMes,
      tipo,
      arquivoNome: path.basename(caminho),
      totalLinhas: parseado.linhas.length,
      totalValor: new Prisma.Decimal(parseado.totalValor.toFixed(2)),
    },
  });

  const sync = await sincronizar(parseado.linhas, tipo, senhaHash);
  console.log(`Sync: ${JSON.stringify(sync)}`);

  const afiliados = await prisma.afiliado.findMany({
    where: { cpf: { in: parseado.linhas.map((l) => l.cpf) } },
    select: { id: true, cpf: true },
  });
  const afiliadoPorCpf = new Map(afiliados.map((a) => [a.cpf, a.id]));

  for (const lote of emLotes(parseado.linhas, LOTE)) {
    await prisma.linhaD8.createMany({
      data: lote.map((linha) => ({
        importacaoId: importacao.id,
        sequencia: linha.sequencia,
        matricula: linha.matricula,
        nome: linha.nome,
        cpf: linha.cpf,
        descricao: linha.descricao,
        valor: new Prisma.Decimal(linha.valor.toFixed(2)),
        afiliadoId: afiliadoPorCpf.get(linha.cpf) ?? null,
      })),
    });
  }

  const linhasComp = await prisma.linhaD8.findMany({
    where: {
      importacao: {
        competenciaAno: parseado.competenciaAno,
        competenciaMes: parseado.competenciaMes,
      },
    },
    select: { cpf: true },
  });
  const cpfsNoD8 = new Set(linhasComp.map((l) => l.cpf));
  const candidatos = await prisma.afiliado.findMany({
    where: { status: { in: ['APROVADO', 'INATIVO'] } },
    select: { id: true, cpf: true, status: true },
  });
  const paraInativar = candidatos.filter((a) => !cpfsNoD8.has(a.cpf) && a.status !== 'INATIVO');
  if (paraInativar.length) {
    await prisma.afiliado.updateMany({
      where: { id: { in: paraInativar.map((a) => a.id) } },
      data: { status: 'INATIVO' },
    });
  }
  console.log(`Inativados: ${paraInativar.length}`);
}

const arquivos = [
  { caminho: path.join(raiz, '5 - D8 Servidor - Maio 2026.pdf'), tipo: 'SERVIDOR', substituirBase: true },
  { caminho: path.join(raiz, '5 - D8 Pensionista - Maio 2026.pdf'), tipo: 'PENSIONISTA', substituirBase: false },
];

try {
  for (const item of arquivos) {
    if (!fs.existsSync(item.caminho)) throw new Error(`Arquivo ausente: ${item.caminho}`);
    await importarArquivo(item);
  }
  const total = await prisma.afiliado.count();
  const aprovados = await prisma.afiliado.count({ where: { status: 'APROVADO' } });
  console.log(`\nConcluído. Afiliados: ${total} (aprovados: ${aprovados}). Senha temp: ${SENHA}`);
} finally {
  await prisma.$disconnect();
}
