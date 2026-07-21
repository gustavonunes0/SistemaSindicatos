import { PrismaClient, Role, StatusNoticia } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@sindprf.local';
// Senha temporária de desenvolvimento — trocar no primeiro login em produção.
const ADMIN_SENHA = process.env.SEED_ADMIN_SENHA ?? 'Admin@123';

async function main(): Promise<void> {
  const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
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
      where: { slug: noticia.slug },
      update: {
        titulo: noticia.titulo,
        conteudo: noticia.conteudo,
        status: StatusNoticia.PUBLICADO,
        publicadoEm: agora,
        autorId: admin.id,
      },
      create: {
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

  const convenios = [
    {
      nome: 'Clínica Saúde Total',
      categoria: 'Saúde',
      descricao:
        'Consultas e exames com desconto exclusivo para afiliados do SINDPRF-CE e dependentes.',
      contato: '(85) 3200-1000',
      link: 'https://example.com/saude-total',
    },
    {
      nome: 'Auto Escola Rodovia',
      categoria: 'Educação',
      descricao: 'Desconto em cursos de direção defensiva e reciclagem para a categoria.',
      contato: '(85) 3200-2000',
      link: 'https://example.com/auto-escola',
    },
    {
      nome: 'Ótica Horizonte',
      categoria: 'Comércio',
      descricao: 'Descontos em armações e lentes para afiliados mediante apresentação de carteirinha.',
      contato: '(85) 3200-3000',
      link: null,
    },
    {
      nome: 'Farmácia Popular CE',
      categoria: 'Saúde',
      descricao: 'Percentual de desconto em medicamentos genéricos e de marca nas lojas conveniadas.',
      contato: '(85) 3200-4000',
      link: null,
    },
  ];

  for (const convenio of convenios) {
    const existente = await prisma.convenio.findFirst({ where: { nome: convenio.nome } });
    if (existente) {
      await prisma.convenio.update({
        where: { id: existente.id },
        data: {
          categoria: convenio.categoria,
          descricao: convenio.descricao,
          contato: convenio.contato,
          link: convenio.link,
          ativo: true,
          vigenciaInicio: agora,
        },
      });
    } else {
      await prisma.convenio.create({
        data: {
          nome: convenio.nome,
          categoria: convenio.categoria,
          descricao: convenio.descricao,
          contato: convenio.contato,
          link: convenio.link,
          ativo: true,
          vigenciaInicio: agora,
        },
      });
    }
  }
  console.log(`Convênios: ${convenios.length}`);

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
    const existente = await prisma.imovel.findFirst({ where: { titulo: imovel.titulo } });
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
