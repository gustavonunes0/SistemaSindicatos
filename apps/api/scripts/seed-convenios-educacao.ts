/**
 * Upsert dos convênios de Educação (portfólio SINDPRF-CE).
 * Baixa logos oficiais da internet e grava em uploads/.
 *
 * Uso (apps/api):
 *   npx tsx scripts/seed-convenios-educacao.ts
 *
 * Na VPS (container):
 *   docker compose exec api npx tsx scripts/seed-convenios-educacao.ts
 */
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_SLUG = 'sindprf-ce';
const UPLOADS_DIR = join(process.cwd(), 'uploads');
const MIN_BYTES = 800;

type ConvenioEducacao = {
  nome: string;
  aliases?: string[];
  descricao: string;
  link: string | null;
  contato: string | null;
  /** URLs candidatas (primeira imagem válida vence). */
  logoUrls: string[];
};

const CONVENIOS: ConvenioEducacao[] = [
  {
    nome: 'Colégio Batista Santos Dumont',
    logoUrls: [
      'https://icon.horse/icon/batista.g12.br',
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.batista.g12.br&size=256',
    ],
    descricao:
      'Convênio educacional para filhos de filiados ao SINDPRF-CE. Descontos progressivos nas mensalidades: 1 aluno 25%; 2 alunos 25% a 30%; 3 ou 4 alunos 25% a 35% (até 35%). Unidades: Aldeota, Seis Bocas, Varjota e Edson Queiroz. Consulte regras e condições.',
    link: 'https://www.batista.g12.br/',
    contato: null,
  },
  {
    nome: 'Colégio Adventista Unidade Fortaleza',
    logoUrls: [
      'https://www.adventistas.org/pt/wp-content/themes/pa-theme-sedes/assets/sedes/pt/logo-iasd-vertical.svg',
      'https://icon.horse/icon/adventistas.org',
    ],
    descricao:
      'Convênio educacional para associados e dependentes do SINDPRF-CE. 20% de desconto nas mensalidades para associados e 15% para dependentes. Endereço: Rua Marechal Deodoro, 112 — Benfica, Fortaleza/CE. Consulte regras e condições.',
    link: 'https://educacao.adventistas.org/',
    contato: null,
  },
  {
    nome: 'Colégio 7 de Setembro',
    logoUrls: [
      'https://www.c7s.com.br/wp-content/uploads/2026/03/logo-1.png',
      'https://icon.horse/icon/c7s.com.br',
    ],
    descricao:
      'Convênio educacional para filhos de filiados ao SINDPRF-CE. Até 35% de desconto nas mensalidades. Unidades em Fortaleza e Eusébio. Tradição em escolas de excelência do Ceará. Consulte regras e condições.',
    link: 'https://www.c7s.com.br/',
    contato: null,
  },
  {
    nome: 'Sesc / Senac',
    logoUrls: [
      'https://icon.horse/icon/sesc.com.br',
      'https://upload.wikimedia.org/wikipedia/commons/d/da/SESC_TV_logo.png',
    ],
    descricao:
      'Condições especiais do Sistema Fecomércio (Sesc/Senac) para filiados e dependentes do SINDPRF-CE. Unidades em Fortaleza, Iguatu, Crato, Sobral e Juazeiro do Norte. Consulte unidades, regras e condições.',
    link: 'https://www.sesc-ce.com.br/',
    contato: null,
  },
  {
    nome: 'Toca da Criança',
    logoUrls: ['https://tocadacrianca.com.br/wp-content/uploads/2025/08/logo_reduzida_2025.png'],
    descricao:
      'Escola e creche — benefício para filhos de filiados ao SINDPRF-CE. 50% de desconto na 1ª mensalidade para novatos e 20% de desconto nas parcelas mensais. Endereço: R. Jornalista Nertan Macêdo, 35 — Cocó, Fortaleza/CE. Consulte regras e condições.',
    link: 'https://tocadacrianca.com.br/',
    contato: null,
  },
  {
    nome: 'Escola SESI SENAI Ceará',
    logoUrls: [
      'https://www.sesi-ce.org.br/themes/sesi/assets/images/logo-sesi.svg',
      'https://icon.horse/icon/sesi.org.br',
    ],
    descricao:
      'Condições especiais em educação, tecnologia e inovação para filhos de filiados ao SINDPRF-CE. Unidades em Fortaleza, Horizonte, Maracanaú, Sobral e Juazeiro do Norte. Consulte unidades, regras e condições.',
    link: 'https://www.sesi-ce.org.br/',
    contato: null,
  },
  {
    nome: 'Unifametro',
    logoUrls: [
      'https://unifametro.edu.br/wp-content/uploads/2023/06/logo-unifametro.png',
      'https://icon.horse/icon/unifametro.edu.br',
    ],
    descricao:
      'Benefício para associados e dependentes do SINDPRF-CE. 30% na graduação presencial; 25% na pós-graduação presencial; 20% em extensão, graduação e tecnólogo nas modalidades semipresencial e EAD. Rua Conselheiro Estelita, 500 — Centro, Fortaleza/CE. Tel.: (85) 3206-6400 / (85) 3022-7030. Consulte regras e condições.',
    link: 'https://unifametro.edu.br/',
    contato: '(85) 3206-6400 / (85) 3022-7030',
  },
  {
    nome: 'UNI7',
    aliases: ['UNI7', 'Uni7'],
    logoUrls: [
      'https://pages.greatpages.com.br/conheca.uni7.edu.br-home/1775757492/imagens/desktop/7461-78f688b9726a9fa995251bdedeed6f9b.png',
      'https://icon.horse/icon/uni7.edu.br',
    ],
    descricao:
      'Centro Universitário 7 de Setembro — benefício para associados e dependentes do SINDPRF-CE. 15% em graduação, pós-graduação e Escola de Negócios UNI7; 10% no curso de Direito. Rua Almirante Maximiano da Fonseca, 1395 — Luciano Cavalcante, Fortaleza/CE. Tel.: (85) 4006-7600. Consulte regras e condições.',
    link: 'https://www.uni7.edu.br/',
    contato: '(85) 4006-7600',
  },
  {
    nome: 'UniATENEU',
    logoUrls: [
      'https://uniateneu.edu.br/wp-content/uploads/2020/08/Logo_300x60.png',
      'https://icon.horse/icon/uniateneu.edu.br',
    ],
    descricao:
      'Benefício para associados e dependentes do SINDPRF-CE em todas as unidades. 35% em graduação e tecnólogo; 40% em pós-graduação; ou 5% adicional sobre campanha vigente. Contato: Vanessa — WhatsApp (85) 99256-2182. Consulte regras e condições.',
    link: 'https://uniateneu.edu.br/',
    contato: 'Vanessa — (85) 99256-2182',
  },
  {
    nome: 'Faculdade CDL',
    logoUrls: [
      'https://faculdadecdl.edu.br/wp-content/uploads/2024/12/logo-faculdade-cdl.webp',
      'https://faculdadecdl.edu.br/wp-content/uploads/2022/11/logo.png',
      'https://icon.horse/icon/faculdadecdl.edu.br',
    ],
    descricao:
      'Benefício para associados e dependentes do SINDPRF-CE. 40% no curso de Direito; 20% em Gestão de Segurança Pública e Privada; 30% em pós-graduação; 25% em cursos de curta duração; 10% em extensão e graduação. Rua 25 de Março, 882 — Centro, Fortaleza/CE. Tel.: (85) 3771-0750. Consulte regras e condições.',
    link: 'https://faculdadecdl.edu.br/',
    contato: '(85) 3771-0750',
  },
  {
    nome: 'Faculdade Luciano Feijão',
    logoUrls: [
      'https://flucianofeijao.com.br/flf/wp-content/uploads/2016/01/Logo_topo_Site.png',
      'https://icon.horse/icon/flucianofeijao.com.br',
    ],
    descricao:
      'Descontos exclusivos nas mensalidades para associados e dependentes legais do SINDPRF-CE, além de apoio a eventos corporativos com palestrantes. Av. Dom José, 325 — Centro, Sobral/CE. Tel.: (88) 3112-1000. Instagram: @flfeijao. Consulte regras e condições.',
    link: 'https://flucianofeijao.com.br/',
    contato: '(88) 3112-1000',
  },
  {
    nome: 'Unifor',
    aliases: ['UNIFOR', 'Unifor'],
    logoUrls: [
      'https://www.unifor.br/o/unifor-theme/images/unifor-logo-horizontal.svg',
      'https://icon.horse/icon/unifor.br',
    ],
    descricao:
      '20% de desconto em graduação e pós-graduação (exceto Medicina) para associados e dependentes de 1º grau do SINDPRF-CE. Contato: Sávio Silva (85) 99198-1279; (85) 3477-3000; WhatsApp (85) 99246-6625. Consulte regras e condições.',
    link: 'https://www.unifor.br/',
    contato: 'Sávio Silva — (85) 99198-1279 / (85) 3477-3000 / WhatsApp (85) 99246-6625',
  },
  {
    nome: 'Estácio',
    logoUrls: [
      'https://cdn.portal.estacio.br/logotipo_marca_estacio_preto_HOME_d4bc9da518_ed6850a937.svg',
      'https://icon.horse/icon/estacio.br',
    ],
    descricao:
      'Centro Universitário Estácio de Sá – FIC. 50% de desconto em extensão e pós-graduação para associados e dependentes do SINDPRF-CE. Site: portal.estacio.br. Consulte regras e condições.',
    link: 'https://portal.estacio.br/',
    contato: null,
  },
  {
    nome: 'UniC - Centro Universitário Cearense',
    logoUrls: [
      'https://icon.horse/icon/unicearense.com.br',
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://unicearense.com.br&size=256',
    ],
    descricao:
      'Benefício para associados e dependentes do SINDPRF-CE. 12% de desconto no período diurno e 10% no período noturno. Av. João Pessoa, 3884 — Damas, Fortaleza/CE. Tel.: (85) 3201-7000. Consulte regras e condições.',
    link: 'https://unicearense.com.br/',
    contato: '(85) 3201-7000',
  },
  {
    nome: 'Invictus Idiomas',
    logoUrls: [
      'https://static.wixstatic.com/media/a32b51_475c7332d98c425bbcb2c85843680d11~mv2.png',
      'https://icon.horse/icon/invictusidiomas.com.br',
    ],
    descricao:
      '40% de desconto em cursos de idiomas (presencial e on-line) para associados e dependentes do SINDPRF-CE. Unidades: Cidade dos Funcionários, Bairro de Fátima, Aldeota e Parquelândia. Contato: Rafael — (85) 9975-0779. Consulte regras e condições.',
    link: 'https://invictusidiomas.com.br/',
    contato: 'Rafael — (85) 9975-0779',
  },
  {
    nome: 'D. Pedro Livraria & Papelaria',
    logoUrls: [
      'https://acdn-us.mitiendanube.com/stores/006/086/336/themes/common/logo-1046041967-1753904358-348285779ae44dda7bd009b7e9a85b4b1753904358.webp',
      'https://icon.horse/icon/livrariadpedro.com.br',
    ],
    descricao:
      'Benefício para associados e dependentes do SINDPRF-CE. 10% em livros didáticos e 15% em materiais escolares. Av. Washington Soares, 3636 — Parque Manibura, Fortaleza/CE. Tel.: (85) 3488-3400. Consulte regras e condições.',
    link: 'https://www.livrariadpedro.com.br/',
    contato: '(85) 3488-3400',
  },
];

function extensaoDe(url: string, contentType: string | null): string {
  const path = new URL(url).pathname.toLowerCase();
  const doPath = extname(path);
  if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico'].includes(doPath)) {
    return doPath === '.jpeg' ? '.jpg' : doPath;
  }
  if (contentType?.includes('svg')) return '.svg';
  if (contentType?.includes('webp')) return '.webp';
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return '.jpg';
  if (contentType?.includes('gif')) return '.gif';
  return '.png';
}

async function baixarLogo(urls: string[]): Promise<{ buffer: Buffer; ext: string; origem: string } | null> {
  for (const url of urls) {
    try {
      const resposta = await fetch(url, {
        headers: { 'User-Agent': 'SINDPRF-CE-seed/1.0' },
        redirect: 'follow',
      });
      if (!resposta.ok) {
        console.warn(`  logo HTTP ${resposta.status}: ${url}`);
        continue;
      }
      const tipo = resposta.headers.get('content-type') ?? '';
      const buffer = Buffer.from(await resposta.arrayBuffer());
      if (buffer.byteLength < MIN_BYTES) {
        console.warn(`  logo pequena (${buffer.byteLength}b): ${url}`);
        continue;
      }
      const pareceImagem =
        tipo.startsWith('image/') ||
        tipo.includes('octet-stream') ||
        buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ||
        buffer.subarray(0, 2).equals(Buffer.from([0xff, 0xd8])) ||
        buffer.toString('utf8', 0, 5).includes('svg') ||
        buffer.toString('utf8', 0, 4) === 'RIFF';
      if (!pareceImagem) {
        console.warn(`  não é imagem (${tipo}): ${url}`);
        continue;
      }
      return { buffer, ext: extensaoDe(url, tipo), origem: url };
    } catch (erro) {
      console.warn(`  falha logo ${url}:`, erro instanceof Error ? erro.message : erro);
    }
  }
  return null;
}

async function salvarUpload(tenantId: string, buffer: Buffer, ext: string): Promise<string> {
  const pasta = join(UPLOADS_DIR, tenantId);
  await mkdir(pasta, { recursive: true });
  const nome = `${randomBytes(12).toString('hex')}${ext}`;
  await writeFile(join(pasta, nome), buffer);
  return `/uploads/${tenantId}/${nome}`;
}

async function encontrarExistente(tenantId: string, item: ConvenioEducacao) {
  const nomes = [item.nome, ...(item.aliases ?? [])];
  for (const nome of nomes) {
    const achado = await prisma.convenio.findFirst({
      where: { tenantId, nome: { equals: nome, mode: 'insensitive' } },
    });
    if (achado) return achado;
  }
  return null;
}

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: TENANT_SLUG } });
  console.log(`Tenant: ${tenant.nome} (${tenant.id})\n`);

  for (const item of CONVENIOS) {
    console.log(`→ ${item.nome}`);
    const logo = await baixarLogo(item.logoUrls);
    const logoUrl = logo ? await salvarUpload(tenant.id, logo.buffer, logo.ext) : null;
    if (logo) {
      console.log(`  logo ok (${logo.buffer.byteLength}b) ← ${logo.origem}`);
      console.log(`  salvo ${logoUrl}`);
    } else {
      console.warn('  sem logo válida — mantém/atualiza sem trocar arquivo');
    }

    const existente = await encontrarExistente(tenant.id, item);
    const dados = {
      nome: item.nome,
      categoria: 'Educação',
      descricao: item.descricao,
      link: item.link,
      contato: item.contato,
      ...(logoUrl ? { logoUrl } : {}),
      ativo: true,
      vigenciaInicio: new Date('2026-01-01T00:00:00.000Z'),
    };

    if (existente) {
      await prisma.convenio.update({
        where: { id: existente.id },
        data: {
          ...dados,
          emiteDeclaracao: existente.emiteDeclaracao,
          modeloDeclaracao: existente.modeloDeclaracao,
          destinoDeclaracao: existente.destinoDeclaracao,
          textoComplementar: existente.textoComplementar,
        },
      });
      console.log(`  atualizado (${existente.nome})`);
    } else {
      await prisma.convenio.create({
        data: {
          tenantId: tenant.id,
          ...dados,
          logoUrl,
          emiteDeclaracao: false,
          modeloDeclaracao: null,
          destinoDeclaracao: null,
          textoComplementar: null,
        },
      });
      console.log('  criado');
    }
  }

  const educacao = await prisma.convenio.findMany({
    where: { tenantId: tenant.id, categoria: 'Educação', ativo: true },
    orderBy: { nome: 'asc' },
    select: { nome: true, logoUrl: true, link: true },
  });
  console.log(`\nEducação ativos (${educacao.length}):`);
  console.table(educacao);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
