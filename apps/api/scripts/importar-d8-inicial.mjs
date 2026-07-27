/**
 * Carga inicial D8 (host): extrai texto com pdfjs e chama POST /d8/importar.
 * Uso: node apps/api/scripts/importar-d8-inicial.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '../../..');
const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
const email = process.env.ADMIN_EMAIL ?? 'admin@sindprf.local';
const senha = process.env.ADMIN_SENHA ?? process.env.SEED_ADMIN_SENHA ?? 'Admin@123';

const arquivos = [
  {
    caminho: path.join(raiz, '5 - D8 Servidor - Maio 2026.pdf'),
    tipo: 'SERVIDOR',
    substituirBase: true,
  },
  {
    caminho: path.join(raiz, '5 - D8 Pensionista - Maio 2026.pdf'),
    tipo: 'PENSIONISTA',
    substituirBase: false,
  },
];

async function extrairTexto(caminho) {
  const data = new Uint8Array(fs.readFileSync(caminho));
  const doc = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
  const partes = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    partes.push(
      content.items.map((item) => ('str' in item ? item.str : '')).filter(Boolean).join(' '),
    );
  }
  return partes.join('\n');
}

async function login() {
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  if (!res.ok) {
    throw new Error(`Login falhou: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.accessToken;
}

async function importar(token, item) {
  const texto = await extrairTexto(item.caminho);
  console.log(`Texto ${item.tipo}: ${texto.length} chars`);
  const res = await fetch(`${apiUrl}/d8/importar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tipo: item.tipo,
      substituirBase: item.substituirBase,
      texto,
      arquivoNome: path.basename(item.caminho),
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Import ${item.tipo} falhou: ${res.status} ${body}`);
  }
  console.log(item.tipo, body);
}

const token = await login();
console.log('Login OK');
for (const item of arquivos) {
  if (!fs.existsSync(item.caminho)) {
    throw new Error(`Arquivo não encontrado: ${item.caminho}`);
  }
  await importar(token, item);
}
console.log('Carga D8 concluída.');
