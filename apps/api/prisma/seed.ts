import { PrismaClient, Role, StatusNoticia } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TENANT_ID = 'tenant_sindprf_ce';
const TENANT_SLUG = 'sindprf-ce';
const ADMIN_EMAIL = 'admin@sindprf.local';
const ADMIN_SENHA = process.env.SEED_ADMIN_SENHA ?? 'Admin@123';

function hostsDoSeed(): { host: string; primario: boolean }[] {
  const hosts = new Map<string, boolean>();
  hosts.set('localhost', true);
  hosts.set('127.0.0.1', false);

  const webUrl = process.env.WEB_URL?.trim();
  if (webUrl) {
    try {
      const host = new URL(webUrl).hostname.toLowerCase();
      if (host && !hosts.has(host)) {
        hosts.set(host, false);
      }
    } catch {
      /* ignore */
    }
  }

  const extra = process.env.TENANT_SEED_HOSTS?.split(',') ?? [];
  for (const h of extra) {
    const host = h.trim().toLowerCase();
    if (host && !hosts.has(host)) {
      hosts.set(host, false);
    }
  }

  return [...hosts.entries()].map(([host, primario]) => ({ host, primario }));
}

async function main(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {
      nome: 'Sindicato dos Policiais Rodoviários Federais no Estado do Ceará',
      timezone: 'America/Fortaleza',
      ativo: true,
    },
    create: {
      id: TENANT_ID,
      slug: TENANT_SLUG,
      nome: 'Sindicato dos Policiais Rodoviários Federais no Estado do Ceará',
      timezone: 'America/Fortaleza',
      ativo: true,
    },
  });

  for (const { host, primario } of hostsDoSeed()) {
    await prisma.tenantDomain.upsert({
      where: { host },
      update: { tenantId: tenant.id, primario },
      create: { tenantId: tenant.id, host, primario },
    });
  }
  console.log(`Tenant: ${tenant.slug} (${tenant.id})`);

  const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10);
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
  console.log(`Admin: ${admin.email}`);

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

  console.log('Convênios: pule o seed fictício (script seed-convenios-declaracao.ts)');

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

  console.log('Seed de produção concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
