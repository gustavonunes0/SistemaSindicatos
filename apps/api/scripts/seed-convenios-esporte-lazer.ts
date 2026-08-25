/**
 * Upsert dos convênios de Esporte e Lazer (portfólio SINDPRF-CE).
 * Baixa as logos oficiais e grava em uploads/.
 *
 * A busca por registro existente é restrita à própria categoria: parceiros como
 * o Sesc aparecem também em Educação, com outro benefício, e não podem ser
 * sobrescritos por engano.
 *
 * Uso (apps/api):
 *   npx tsx scripts/seed-convenios-esporte-lazer.ts
 *
 * Na VPS (container):
 *   docker compose exec api npx tsx scripts/seed-convenios-esporte-lazer.ts
 */
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_SLUG = 'sindprf-ce';
const CATEGORIA = 'Esporte e Lazer';
const UPLOADS_DIR = join(process.cwd(), 'uploads');
const MIN_BYTES = 800;

type ConvenioEsporteLazer = {
  nome: string;
  /** Outros nomes pelos quais o registro pode estar salvo hoje. */
  aliases?: string[];
  descricao: string;
  link: string | null;
  contato: string | null;
  /** URLs candidatas (a primeira imagem válida vence). */
  logoUrls?: string[];
  /** Arquivo do repositório, quando o parceiro não tem logo pública. */
  logoArquivo?: string;
};

const CONVENIOS: ConvenioEsporteLazer[] = [
  {
    nome: 'Clube de Tiro Sniper',
    logoUrls: [
      'https://icon.horse/icon/snipereusebio.com.br',
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.snipereusebio.com.br&size=256',
    ],
    descricao:
      'Benefícios para associados e dependentes do SINDPRF-CE no Clube de Tiro Sniper. Instalações para treinamento regulamentado, área de lazer, piscina, restaurante e serviços. Unidades em Fortaleza (Sniper Indoor — Rua República da Armênia, 630, loja 3, Parque Manibura) e Eusébio (Estrada do Guarani, 1201, BR-116 km 16, Pedras). As atividades de tiro são destinadas exclusivamente a adultos habilitados, conforme a legislação e as regras do clube. Consulte regras e condições.',
    link: 'https://www.snipereusebio.com.br/',
    contato: '(85) 99906-6918 (Eusébio) / (85) 98109-6535 (Fortaleza)',
  },
  {
    nome: 'Sistema Fecomércio Sesc / Senac',
    aliases: ['SESC', 'Sesc', 'Sesc / Senac — Esporte e Lazer'],
    logoUrls: [
      'https://icon.horse/icon/sesc.com.br',
      'https://upload.wikimedia.org/wikipedia/commons/d/da/SESC_TV_logo.png',
    ],
    descricao:
      'Descontos em serviços de educação, esporte, lazer e saúde do Sistema Fecomércio (Sesc/Senac) para associados e dependentes do SINDPRF-CE. Como ter acesso: matrícula nas unidades Sesc ou Senac, de segunda a sexta, das 8h às 17h. Documentos: identidade, CPF, comprovante de endereço, declaração de filiação ao SINDPRF-CE e cartão Sesc. Unidades: Fortaleza, Aquiraz, Maranguape, Sobral, Iguatu, Crato e Juazeiro do Norte. Consulte regras e condições.',
    link: 'https://www.sesc-ce.com.br/',
    contato: null,
  },
  {
    nome: 'Academia do SINDPRF-CE',
    // Brasão do sindicato em 192px: o logo-sindicato.png tem 1,5 MB e pesaria
    // demais numa listagem que carrega todos os cartões de uma vez.
    logoArquivo: join(process.cwd(), '..', 'web', 'public', 'icons', 'pwa-192.png'),
    descricao:
      'Academia do SINDPRF-CE, no Centro de Treinamento da PRF-CE. Servidores ativos têm acesso livre, todos os dias e horários. Aposentados, pensionistas, dependentes, estagiários e colaboradores podem utilizar de segunda a sexta, das 6h às 18h. Nos fins de semana e feriados o acesso é exclusivo para servidores ativos. Mais informações na Secretaria do SINDPRF-CE: (85) 98724-2483.',
    link: null,
    contato: 'Secretaria do SINDPRF-CE — (85) 98724-2483',
  },
  {
    nome: 'Wellhub (Gympass)',
    aliases: ['Wellhub', 'Gympass'],
    logoUrls: [
      'https://icon.horse/icon/wellhub.com',
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://wellhub.com&size=256',
    ],
    descricao:
      'Convênio Wellhub (antigo Gympass) via FENAPRF: bem-estar onde você estiver, com uma ampla rede em todo o país reunindo academias, estúdios e atividades físicas numa única plataforma digital. Desconto diferenciado na adesão para associados titulares e seus dependentes. Mais informações na Secretaria do SINDPRF-CE: (85) 98724-2483. Consulte regras e condições.',
    link: 'https://wellhub.com/pt-br/',
    contato: 'Secretaria do SINDPRF-CE — (85) 98724-2483',
  },
  {
    nome: 'TotalPass',
    logoUrls: [
      'https://icon.horse/icon/totalpass.com.br',
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.totalpass.com.br&size=256',
    ],
    descricao:
      'Atividade física e bem-estar em todo o país com o TotalPass: ampla rede de academias, estúdios e atividades físicas numa única plataforma, incluindo unidades da Smart Fit conforme o plano escolhido. Desconto diferenciado na adesão para associados titulares e seus dependentes. Mais informações na Secretaria do SINDPRF-CE: (85) 98724-2483. Consulte as regras, os planos e as condições.',
    link: 'https://www.totalpass.com.br/',
    contato: 'Secretaria do SINDPRF-CE — (85) 98724-2483',
  },
  {
    nome: 'Remanso Hotel de Serra',
    logoUrls: [
      'https://static.wixstatic.com/media/ff6bf6_6cb3f5967ada4c26a9401daa5cd39d2f.png',
      'https://icon.horse/icon/remansohotel.com',
    ],
    descricao:
      'Lazer e tranquilidade em Guaramiranga, no Maciço de Baturité. Associados e dependentes do SINDPRF-CE podem utilizar as instalações do hotel e aproveitar momentos de descanso na serra, com hospedagem, área de lazer e contato com a natureza. Reservas: Rua Barão do Rio Branco, 1721 — Centro, Guaramiranga/CE. Tel.: (85) 3231-7088 / (85) 3325-1222. Consulte as regras e as condições.',
    link: 'https://www.remansohotel.com/',
    contato: '(85) 3231-7088 / (85) 3325-1222',
  },
  {
    nome: 'Sítio do Bosco Park',
    aliases: ['Sítio do Bosco'],
    logoUrls: [
      'https://sitiodobosco.com.br/wp-content/uploads/2025/12/sitio-do-bosco-park-logo.png',
      'https://icon.horse/icon/sitiodobosco.com.br',
    ],
    descricao:
      'Aventura, lazer e descanso em Tianguá, na Serra da Ibiapaba. Benefício para associados e dependentes do SINDPRF-CE: 50% de desconto nos ingressos de entrada; 15% de desconto na hospedagem de domingo a quinta; 10% de desconto na hospedagem de sexta a sábado, feriados e férias de janeiro, julho e dezembro. Estrutura com pousada, camping, restaurante e esporte-aventura. Vila Acarape, zona rural — Tianguá/CE. WhatsApp: (88) 99444-8967. Instagram: @sitiodobosco. Consulte as regras e as condições.',
    link: 'https://sitiodobosco.com.br/',
    contato: 'WhatsApp (88) 99444-8967',
  },
  {
    nome: 'Proftur Viagens e Turismo',
    aliases: ['Proftur'],
    logoUrls: [
      'https://icon.horse/icon/proftur.com.br',
      'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.proftur.com.br&size=256',
    ],
    descricao:
      'Agência de turismo Proftur: 5% de desconto no valor dos pacotes terrestres individuais para associados e dependentes do SINDPRF-CE. Pacotes terrestres, viagens individuais e destinos para conhecer. Contato: Roberto — (85) 98831-3466 / (85) 99993-7681. Consulte as regras e as condições.',
    link: 'https://www.proftur.com.br/',
    contato: 'Roberto — (85) 98831-3466 / (85) 99993-7681',
  },
  {
    nome: 'Pousada Zayn — Barra Grande/PI',
    aliases: ['Pousada Zayn'],
    descricao:
      '10% de desconto para PRFs indicados pelo SINDPRF-CE na Pousada Zayn, em Barra Grande/PI. Uma criança de até 5 anos fica grátis por reserva e o café da manhã está incluso. Check-in às 14h e check-out às 12h. Suítes com ar-condicionado, Wi-Fi, TV e frigobar. Estrutura com piscina, bar com sinuca, churrasqueira, área kids, campo society e estacionamento interno. Reserva com 50% de sinal e o restante no check-in. Desconto não aplicável no Natal, Réveillon e Carnaval.',
    link: null,
    contato: null,
  },
];

function extensaoDe(url: string, contentType: string | null): string {
  const doPath = extname(new URL(url).pathname.toLowerCase());
  if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico'].includes(doPath)) {
    return doPath === '.jpeg' ? '.jpg' : doPath;
  }
  if (contentType?.includes('svg')) return '.svg';
  if (contentType?.includes('webp')) return '.webp';
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return '.jpg';
  if (contentType?.includes('gif')) return '.gif';
  return '.png';
}

type LogoBaixada = { buffer: Buffer; ext: string; origem: string };

async function baixarLogo(urls: string[]): Promise<LogoBaixada | null> {
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

async function lerLogoLocal(caminho: string): Promise<LogoBaixada | null> {
  try {
    const buffer = await readFile(caminho);
    return { buffer, ext: extname(caminho) || '.png', origem: caminho };
  } catch (erro) {
    console.warn(`  falha ao ler ${caminho}:`, erro instanceof Error ? erro.message : erro);
    return null;
  }
}

async function salvarUpload(tenantId: string, buffer: Buffer, ext: string): Promise<string> {
  const pasta = join(UPLOADS_DIR, tenantId);
  await mkdir(pasta, { recursive: true });
  const nome = `${randomBytes(12).toString('hex')}${ext}`;
  await writeFile(join(pasta, nome), buffer);
  return `/uploads/${tenantId}/${nome}`;
}

async function encontrarExistente(tenantId: string, item: ConvenioEsporteLazer) {
  for (const nome of [item.nome, ...(item.aliases ?? [])]) {
    const achado = await prisma.convenio.findFirst({
      where: { tenantId, categoria: CATEGORIA, nome: { equals: nome, mode: 'insensitive' } },
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

    const logo = item.logoArquivo
      ? await lerLogoLocal(item.logoArquivo)
      : item.logoUrls
        ? await baixarLogo(item.logoUrls)
        : null;
    const logoUrl = logo ? await salvarUpload(tenant.id, logo.buffer, logo.ext) : null;
    if (logo) {
      console.log(`  logo ok (${logo.buffer.byteLength}b) ← ${logo.origem}`);
      console.log(`  salvo ${logoUrl}`);
    } else {
      console.warn('  sem logo — mantém a atual, se houver');
    }

    const existente = await encontrarExistente(tenant.id, item);
    const dados = {
      nome: item.nome,
      categoria: CATEGORIA,
      descricao: item.descricao,
      link: item.link,
      contato: item.contato,
      ...(logoUrl ? { logoUrl } : {}),
      ativo: true,
      vigenciaInicio: new Date('2026-01-01T00:00:00.000Z'),
    };

    if (existente) {
      // A emissão de declaração é configurada à parte e não pode ser perdida
      // num reprocessamento do portfólio.
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
      console.log(`  atualizado (era "${existente.nome}")`);
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

  const ativos = await prisma.convenio.findMany({
    where: { tenantId: tenant.id, categoria: CATEGORIA, ativo: true },
    orderBy: { nome: 'asc' },
    select: { nome: true, logoUrl: true, link: true, emiteDeclaracao: true },
  });
  console.log(`\n${CATEGORIA} — ativos (${ativos.length}):`);
  console.table(
    ativos.map((c) => ({
      nome: c.nome,
      logo: c.logoUrl ? 'sim' : '—',
      declaracao: c.emiteDeclaracao ? 'sim' : '—',
      link: c.link ?? '—',
    })),
  );
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
