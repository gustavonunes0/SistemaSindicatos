/**
 * Compara o custo de um round-trip ao banco entre variantes da DATABASE_URL.
 * Serve para decidir porta do pooler Supabase (5432 sessão x 6543 transação)
 * e o efeito da flag `pgbouncer=true`, que desliga prepared statements.
 *
 * Uso: node scripts/medir-latencia-banco.mjs
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

function lerUrlDoEnv() {
  const linha = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('DATABASE_URL='));
  if (!linha) throw new Error('DATABASE_URL não encontrada no .env da raiz');
  return linha.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
}

function variantes(urlBase) {
  const url = new URL(urlBase);
  const montar = (porta, pgbouncer) => {
    const u = new URL(url.toString());
    u.port = String(porta);
    u.searchParams.delete('pgbouncer');
    if (pgbouncer) u.searchParams.set('pgbouncer', 'true');
    return u.toString();
  };
  return [
    { rotulo: '5432 sessão   + pgbouncer=true  (atual)', url: montar(5432, true) },
    { rotulo: '5432 sessão   sem pgbouncer', url: montar(5432, false) },
    { rotulo: '6543 transação + pgbouncer=true', url: montar(6543, true) },
  ];
}

async function medir(url) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const amostras = [];
    for (let i = 0; i < 6; i += 1) {
      const inicio = process.hrtime.bigint();
      await prisma.$queryRaw`SELECT 1`;
      amostras.push(Number(process.hrtime.bigint() - inicio) / 1_000_000);
    }
    const [fria, ...quentes] = amostras;
    return { fria, media: quentes.reduce((s, v) => s + v, 0) / quentes.length };
  } finally {
    await prisma.$disconnect();
  }
}

const urlBase = lerUrlDoEnv();
console.log(`host: ${new URL(urlBase).hostname}\n`);

for (const { rotulo, url } of variantes(urlBase)) {
  try {
    const { fria, media } = await medir(url);
    console.log(`${rotulo.padEnd(42)} fria ${fria.toFixed(0).padStart(5)} ms | quente ${media.toFixed(0).padStart(4)} ms`);
  } catch (erro) {
    console.log(`${rotulo.padEnd(42)} FALHOU: ${erro.message.split('\n')[0]}`);
  }
}
