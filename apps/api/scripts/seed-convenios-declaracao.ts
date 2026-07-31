/**
 * Cadastra os convênios com emissão de declaração (PDFs de referência 2026)
 * e associa logos públicos (URL estável na internet).
 *
 * Uso: npx tsx scripts/seed-convenios-declaracao.ts
 */
import { ModeloDeclaracao, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type ConvenioSeed = {
  nome: string;
  categoria: string;
  descricao: string;
  link: string | null;
  contato: string | null;
  modeloDeclaracao: ModeloDeclaracao;
  destinoDeclaracao: string;
  textoComplementar: string | null;
  logoUrls: string[];
};

const CONVENIOS: ConvenioSeed[] = [
  {
    nome: 'Unimed',
    categoria: 'Saúde',
    descricao:
      'Convênio com a Unimed para planos e atendimento em saúde. Afiliados aprovados podem emitir declaração de filiação para uso junto à operadora.',
    link: 'https://www.unimed.coop.br/',
    contato: null,
    modeloDeclaracao: ModeloDeclaracao.FILIADO,
    destinoDeclaracao: 'Unimed Ceará',
    textoComplementar: null,
    logoUrls: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Unimed_institucional.png',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Logounimed1.jpg',
      'https://www.google.com/s2/favicons?domain=unimed.coop.br&sz=256',
    ],
  },
  {
    nome: 'Unimed Sintrajufe',
    categoria: 'Saúde',
    descricao:
      'Convênio Unimed via Sintrajufe. Emita a declaração de filiação ao SINDPRF-CE para apresentar na contratação/uso do benefício.',
    link: 'https://www.unimed.coop.br/',
    contato: null,
    modeloDeclaracao: ModeloDeclaracao.FILIADO,
    destinoDeclaracao: 'Unimed / Sintrajufe',
    textoComplementar: null,
    logoUrls: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Unimed_institucional.png',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Logounimed1.jpg',
      'https://www.google.com/s2/favicons?domain=unimed.coop.br&sz=256',
    ],
  },
  {
    nome: 'Uniodonto',
    categoria: 'Saúde',
    descricao:
      'Plano odontológico Uniodonto para afiliados. Gere a declaração de filiação para comprovar vínculo junto à cooperativa.',
    link: 'https://www.uniodonto.coop.br/',
    contato: null,
    modeloDeclaracao: ModeloDeclaracao.FILIADO,
    destinoDeclaracao: 'Uniodonto',
    textoComplementar: null,
    logoUrls: [
      'https://uniodonto-metropolitana.com.br/wp-content/uploads/2026/04/LOGO-UNIODONTO-VETOR.png',
      'https://www.google.com/s2/favicons?domain=uniodonto-metropolitana.com.br&sz=256',
    ],
  },
  {
    nome: 'Unidental',
    categoria: 'Saúde',
    descricao:
      'Convênio odontológico Unidental. Afiliados podem emitir declaração de filiação para uso junto ao parceiro.',
    link: 'https://www.unidental.com.br/',
    contato: null,
    modeloDeclaracao: ModeloDeclaracao.FILIADO,
    destinoDeclaracao: 'Unidental',
    textoComplementar: null,
    logoUrls: [
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.unidental.com.br&size=256',
      'https://www.google.com/s2/favicons?domain=unidental.com.br&sz=256',
    ],
  },
  {
    nome: 'UNI7',
    categoria: 'Educação',
    descricao:
      'Centro Universitário 7 de Setembro (UNI7). Emita declaração de filiação ao sindicato para aproveitar condições do convênio educacional.',
    link: 'https://www.uni7.edu.br/',
    contato: '(85) 4006-7676',
    modeloDeclaracao: ModeloDeclaracao.FILIADO,
    destinoDeclaracao: 'Centro Universitário 7 de Setembro — UNI7',
    textoComplementar: null,
    logoUrls: [
      'https://pages.greatpages.com.br/conheca.uni7.edu.br-home/1775757492/imagens/desktop/7461-78f688b9726a9fa995251bdedeed6f9b.png',
      'https://www.google.com/s2/favicons?domain=uni7.edu.br&sz=256',
    ],
  },
  {
    nome: 'UNIFOR',
    categoria: 'Educação',
    descricao:
      'Universidade de Fortaleza. Declaração específica de dependente do associado para uso no convênio educacional.',
    link: 'https://www.unifor.br/',
    contato: null,
    modeloDeclaracao: ModeloDeclaracao.DEPENDENTE,
    destinoDeclaracao: 'Universidade de Fortaleza — UNIFOR',
    textoComplementar: null,
    logoUrls: [
      'https://www.unifor.br/o/unifor-theme/images/unifor-logo-horizontal.svg',
      'https://www.unifor.br/documents/20143/404154/logo-unifor-facebook.jpg',
      'https://www.google.com/s2/favicons?domain=unifor.br&sz=256',
    ],
  },
  {
    nome: 'SESC',
    categoria: 'Lazer',
    descricao:
      'Convênio com o Sistema FECOMÉRCIO (SESC/SENAC). Afiliados podem emitir declaração de filiação para credenciamento e uso dos serviços.',
    link: 'https://www.sesc-ce.com.br/',
    contato: null,
    modeloDeclaracao: ModeloDeclaracao.FILIADO,
    destinoDeclaracao: 'Sistema FECOMÉRCIO (SESC/SENAC)',
    textoComplementar:
      'Declara, ainda, que o(a) associado(a) e seus dependentes fazem jus aos benefícios do convênio, inclusive quanto à isenção/condições da taxa de credencial, nos termos acordados entre as partes.',
    logoUrls: [
      'https://www.google.com/s2/favicons?domain=sesc.com.br&sz=256',
      'https://upload.wikimedia.org/wikipedia/commons/d/da/SESC_TV_logo.png',
      'https://www.google.com/s2/favicons?domain=www.sesc-ce.com.br&sz=256',
    ],
  },
  {
    nome: 'Remanso Hotel de Serra',
    categoria: 'Lazer',
    descricao:
      'Hospedagem no Remanso Hotel de Serra (Guaramiranga). O afiliado solicita autorização com o período desejado e apresenta o PDF na reserva junto ao hotel.',
    link: 'https://www.remansohotel.com/',
    contato: '(85) 3231-7088',
    modeloDeclaracao: ModeloDeclaracao.AUTORIZACAO_HOSPEDAGEM,
    destinoDeclaracao: 'Remanso Hotel de Serra',
    textoComplementar:
      'A reserva está condicionada à disponibilidade e às regras do hotel. O valor cobrado na reserva destina-se à consumação durante a estadia, conforme orientação do parceiro.',
    logoUrls: [
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.remansohotel.com&size=256',
      'https://www.google.com/s2/favicons?domain=remansohotel.com&sz=256',
    ],
  },
];

const FALSOS_SEED = [
  'Clínica Saúde Total',
  'Auto Escola Rodovia',
  'Ótica Horizonte',
  'Farmácia Popular CE',
];

async function primeiraLogoValida(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    try {
      const resposta = await fetch(url, {
        headers: { 'User-Agent': 'SINDPRF-CE-seed/1.0' },
        redirect: 'follow',
      });
      if (!resposta.ok) continue;
      const tipo = resposta.headers.get('content-type') ?? '';
      if (!tipo.startsWith('image/')) continue;
      const tamanho = Number(resposta.headers.get('content-length') ?? 0);
      // Descarta ícones minúsculos; aceita se o header não informar tamanho.
      if (tamanho > 0 && tamanho < 400) continue;
      console.log(`  logo ok (${tipo}${tamanho ? `, ${tamanho}b` : ''}) ← ${url}`);
      return resposta.url || url;
    } catch (erro) {
      console.warn(`  falha logo ${url}:`, erro instanceof Error ? erro.message : erro);
    }
  }
  return null;
}

async function upsertConvenio(item: ConvenioSeed, logoUrl: string | null): Promise<void> {
  const dados = {
    categoria: item.categoria,
    descricao: item.descricao,
    link: item.link,
    contato: item.contato,
    logoUrl,
    ativo: true,
    emiteDeclaracao: true,
    modeloDeclaracao: item.modeloDeclaracao,
    destinoDeclaracao: item.destinoDeclaracao,
    textoComplementar: item.textoComplementar,
    vigenciaInicio: new Date('2026-01-01T00:00:00.000Z'),
  };

  const existente = await prisma.convenio.findFirst({ where: { nome: item.nome } });
  if (existente) {
    await prisma.convenio.update({ where: { id: existente.id }, data: dados });
    console.log(`atualizado: ${item.nome}`);
    return;
  }

  await prisma.convenio.create({
    data: { nome: item.nome, ...dados },
  });
  console.log(`criado: ${item.nome}`);
}

async function main(): Promise<void> {
  for (const nome of FALSOS_SEED) {
    const r = await prisma.convenio.updateMany({
      where: { nome },
      data: { ativo: false },
    });
    if (r.count > 0) console.log(`desativado seed fictício: ${nome}`);
  }

  for (const item of CONVENIOS) {
    console.log(`\n→ ${item.nome}`);
    const logoUrl = await primeiraLogoValida(item.logoUrls);
    await upsertConvenio(item, logoUrl);
  }

  const ativos = await prisma.convenio.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' },
    select: {
      nome: true,
      emiteDeclaracao: true,
      modeloDeclaracao: true,
      logoUrl: true,
    },
  });
  console.log('\nConvênios ativos:');
  console.table(ativos);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
