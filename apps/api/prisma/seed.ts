import { PrismaClient, Role, StatusNoticia, TenantTipo } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TENANT_ID = 'tenant_sindprf_ce';
const TENANT_SLUG = 'sindprf-ce';
const PLATFORM_ID = 'tenant_plataforma';
const PLATFORM_SLUG = 'sindigest';

const ADMIN_EMAIL = 'admin@sindprf.local';
const SUPERADMIN_EMAIL = process.env.SEED_SUPERADMIN_EMAIL ?? 'superadmin@sindigest.local';
const ADMIN_SENHA = process.env.SEED_ADMIN_SENHA ?? 'Admin@123';

const BRANDING_SINDPRF = {
  nome: 'SINDPRF-CE',
  nomeCompleto: 'Sindicato dos Policiais Rodoviários Federais no Estado do Ceará',
  logoUrl: '/logo-sindicato.png',
  sede: {
    endereco: 'Rua Margarida de Queiroz, 07 — Cajazeiras — Fortaleza/CE',
    cep: '60.864-300',
  },
  contato: {
    telefones: ['(85) 3279-2848', '(85) 3279-5698', '(85) 3279-7852'],
    email: 'sindprfce@sindprfce.com.br',
  },
  reservaApartamentosUrl: 'https://abre.ai/sindprfcereserva',
  regulamentoApartamentosUrl: '/imoveis/regulamento-apartamentos.pdf',
  themeColor: '#0b3d6b',
  contatoDestinoEmail: 'sindprfce@sindprfce.com.br',
  vapidSubject: 'mailto:sindprfce@sindprfce.com.br',
};

const BRANDING_PLATAFORMA = {
  nome: 'SindiGest',
  nomeCompleto: 'SindiGest — plataforma Stellar para sindicatos',
  logoUrl: '/logo-sindicato.png',
  sede: { endereco: 'Stellar Soluções', cep: '—' },
  contato: {
    telefones: [],
    email: 'contato@stellarsolucoes.com.br',
  },
  themeColor: '#0b3d6b',
};

function parseHostList(envName: string): string[] {
  return (process.env[envName] ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function hostsSindicato(): { host: string; primario: boolean }[] {
  const hosts = new Map<string, boolean>();
  hosts.set('localhost', true);
  hosts.set('127.0.0.1', false);

  const webUrl = process.env.WEB_URL?.trim();
  if (webUrl) {
    try {
      const host = new URL(webUrl).hostname.toLowerCase();
      // Não misturar host da plataforma no tenant do sindicato
      if (host && !host.startsWith('sindigest.') && !hosts.has(host)) {
        hosts.set(host, host.includes('sindprf'));
      }
    } catch {
      /* ignore */
    }
  }

  for (const host of parseHostList('TENANT_SEED_HOSTS')) {
    if (host.startsWith('sindigest.')) continue;
    if (!hosts.has(host)) hosts.set(host, host.includes('sindprf'));
  }

  // Produção Stellar — cliente PRF
  if (!hosts.has('sindprf.stellarsolucoes.com.br')) {
    hosts.set('sindprf.stellarsolucoes.com.br', true);
  }

  return [...hosts.entries()].map(([host, primario]) => ({ host, primario }));
}

function hostsPlataforma(): string[] {
  const set = new Set<string>(['sindigest.stellarsolucoes.com.br']);
  for (const host of parseHostList('PLATFORM_SEED_HOSTS')) {
    set.add(host);
  }
  return [...set];
}

async function main(): Promise<void> {
  const plataforma = await prisma.tenant.upsert({
    where: { slug: PLATFORM_SLUG },
    update: {
      nome: 'SindiGest (plataforma)',
      tipo: TenantTipo.PLATAFORMA,
      timezone: 'America/Fortaleza',
      ativo: true,
      branding: BRANDING_PLATAFORMA,
    },
    create: {
      id: PLATFORM_ID,
      slug: PLATFORM_SLUG,
      nome: 'SindiGest (plataforma)',
      tipo: TenantTipo.PLATAFORMA,
      timezone: 'America/Fortaleza',
      ativo: true,
      branding: BRANDING_PLATAFORMA,
    },
  });
  console.log(`Plataforma: ${plataforma.slug}`);

  for (const host of hostsPlataforma()) {
    await prisma.tenantDomain.upsert({
      where: { host },
      update: { tenantId: plataforma.id, primario: host.startsWith('sindigest.') },
      create: {
        tenantId: plataforma.id,
        host,
        primario: host.startsWith('sindigest.'),
      },
    });
    console.log(`  platform domain: ${host}`);
  }

  const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10);
  const superadmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: plataforma.id, email: SUPERADMIN_EMAIL } },
    update: { role: Role.SUPERADMIN },
    create: {
      tenantId: plataforma.id,
      email: SUPERADMIN_EMAIL,
      senhaHash,
      role: Role.SUPERADMIN,
    },
  });
  console.log(`SUPERADMIN: ${superadmin.email}`);

  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {
      nome: 'Sindicato dos Policiais Rodoviários Federais no Estado do Ceará',
      tipo: TenantTipo.SINDICATO,
      timezone: 'America/Fortaleza',
      ativo: true,
      branding: BRANDING_SINDPRF,
    },
    create: {
      id: TENANT_ID,
      slug: TENANT_SLUG,
      nome: 'Sindicato dos Policiais Rodoviários Federais no Estado do Ceará',
      tipo: TenantTipo.SINDICATO,
      timezone: 'America/Fortaleza',
      ativo: true,
      branding: BRANDING_SINDPRF,
    },
  });

  for (const { host, primario } of hostsSindicato()) {
    await prisma.tenantDomain.upsert({
      where: { host },
      update: { tenantId: tenant.id, primario },
      create: { tenantId: tenant.id, host, primario },
    });
    console.log(`  sindicato domain: ${host}`);
  }
  console.log(`Tenant: ${tenant.slug} (${tenant.id})`);

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: ADMIN_EMAIL } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: ADMIN_EMAIL,
      senhaHash,
      role: Role.ADMIN,
    },
  });
  console.log(`Admin sindicato: ${admin.email}`);

  const agora = new Date();
  const noticias = [
    {
      titulo: 'Sindicato convoca AGE para 18 de março',
      slug: 'sindicato-convoca-age-18-marco',
      conteudo: `<p>A diretoria do SINDPRF-CE convoca os associados para Assembleia Geral Extraordinária no dia 18 de março, às 19h, na sede do sindicato.</p>
<p>Pauta: prestação de contas, convênios e deliberações da categoria. Compareçam.</p>`,
    },
    {
      titulo: 'Nova rede de convênios para afiliados',
      slug: 'nova-rede-convenios-afiliados',
      conteudo: `<p>O SINDPRF-CE amplia a rede de parceiros com descontos em saúde, educação e serviços automotivos.</p>
<p>Consulte a área do afiliado para ver os benefícios ativos e as regras de uso.</p>`,
    },
    {
      titulo: 'Apartamentos de lazer: calendário atualizado',
      slug: 'apartamentos-lazer-calendario-atualizado',
      conteudo: `<p>Os imóveis do sindicato estão disponíveis para locação pelos afiliados. Confira o calendário de disponibilidade e abra sua solicitação pela área restrita.</p>
<p>Em caso de dúvidas, fale com a secretaria pelos canais oficiais.</p>`,
    },
  ];

  for (const noticia of noticias) {
    await prisma.noticia.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: noticia.slug } },
      update: {
        titulo: noticia.titulo,
        conteudo: noticia.conteudo,
        status: StatusNoticia.PUBLICADO,
        publicadoEm: agora,
        autorId: admin.id,
      },
      create: {
        tenantId: tenant.id,
        titulo: noticia.titulo,
        slug: noticia.slug,
        conteudo: noticia.conteudo,
        status: StatusNoticia.PUBLICADO,
        publicadoEm: agora,
        autorId: admin.id,
      },
    });
  }
  console.log(`Notícias: ${noticias.length}`);

  const imoveis = [
    {
      titulo: 'Apto Beira-Mar',
      descricao:
        'Apartamento amplo com vista para o mar, ideal para afiliados. Cozinha completa, Wi-Fi e ar-condicionado.',
      endereco: 'Av. Beira Mar, 500 — Fortaleza/CE',
      valor: 450,
      comodidades: ['Wi-Fi', 'Ar-condicionado', 'Vista mar'],
    },
    {
      titulo: 'Casa Cajazeiras',
      descricao:
        'Casa próxima à sede do sindicato, com dois quartos, área gourmet e vaga de garagem.',
      endereco: 'Rua Margarida de Queiroz, 120 — Cajazeiras — Fortaleza/CE',
      valor: 380,
      comodidades: ['Garagem', 'Área gourmet', 'Dois quartos'],
    },
  ];

  for (const imovel of imoveis) {
    const existente = await prisma.imovel.findFirst({
      where: { tenantId: tenant.id, titulo: imovel.titulo },
    });
    if (existente) {
      await prisma.imovel.update({
        where: { id: existente.id },
        data: {
          descricao: imovel.descricao,
          endereco: imovel.endereco,
          valor: imovel.valor,
          comodidades: imovel.comodidades,
          ativo: true,
        },
      });
    } else {
      await prisma.imovel.create({
        data: {
          tenantId: tenant.id,
          titulo: imovel.titulo,
          descricao: imovel.descricao,
          endereco: imovel.endereco,
          valor: imovel.valor,
          comodidades: imovel.comodidades,
          ativo: true,
        },
      });
    }
  }
  console.log(`Imóveis: ${imoveis.length}`);
  console.log('Seed Fase B concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
