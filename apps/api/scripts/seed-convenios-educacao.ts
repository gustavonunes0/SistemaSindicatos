/**
 * Upsert dos convênios de Educação a partir do portfólio SINDPRF-CE.
 * Copia logos de tmp-convenios-logos para uploads do tenant.
 *
 * Uso (na pasta apps/api):
 *   npx tsx scripts/seed-convenios-educacao.ts
 */
import { randomBytes } from 'node:crypto';
import { copyFile, mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_SLUG = 'sindprf-ce';
/** Pasta com as PNGs. Na VPS: LOGOS_DIR=/tmp/convenios-logos */
const LOGOS_DIR =
  process.env.LOGOS_DIR?.trim() || join(process.cwd(), '..', '..', 'tmp-convenios-logos');
const UPLOADS_DIR = join(process.cwd(), 'uploads');

type ConvenioEducacao = {
  /** Nome canônico no banco (match de upsert). */
  nome: string;
  /** Nomes alternativos já existentes para atualizar. */
  aliases?: string[];
  logoArquivo: string;
  descricao: string;
  link: string | null;
  contato: string | null;
};

const CONVENIOS: ConvenioEducacao[] = [
  {
    nome: 'Colégio Batista Santos Dumont',
    logoArquivo: 'colegio-batista-santos-dumont.png',
    descricao:
      'Convênio educacional para filhos de filiados ao SINDPRF-CE. Descontos progressivos nas mensalidades: 1 aluno 25%; 2 alunos 25% a 30%; 3 ou 4 alunos 25% a 35% (até 35%). Unidades: Aldeota, Seis Bocas, Varjota e Edson Queiroz. Consulte regras e condições.',
    link: null,
    contato: null,
  },
  {
    nome: 'Colégio Adventista Unidade Fortaleza',
    logoArquivo: 'colegio-adventista-fortaleza.png',
    descricao:
      'Convênio educacional para associados e dependentes do SINDPRF-CE. 20% de desconto nas mensalidades para associados e 15% para dependentes. Endereço: Rua Marechal Deodoro, 112 — Benfica, Fortaleza/CE. Consulte regras e condições.',
    link: null,
    contato: null,
  },
  {
    nome: 'Colégio 7 de Setembro',
    logoArquivo: 'colegio-7-de-setembro.png',
    descricao:
      'Convênio educacional para filhos de filiados ao SINDPRF-CE. Até 35% de desconto nas mensalidades. Unidades em Fortaleza e Eusébio. Tradição em escolas de excelência do Ceará. Consulte regras e condições.',
    link: null,
    contato: null,
  },
  {
    nome: 'Sesc / Senac',
    logoArquivo: 'sesc-senac.png',
    descricao:
      'Condições especiais do Sistema Fecomércio (Sesc/Senac) para filiados e dependentes do SINDPRF-CE. Unidades em Fortaleza, Iguatu, Crato, Sobral e Juazeiro do Norte. Consulte unidades, regras e condições.',
    link: 'https://www.sesc-ce.com.br/',
    contato: null,
  },
  {
    nome: 'Toca da Criança',
    logoArquivo: 'toca-da-crianca.png',
    descricao:
      'Escola e creche — benefício para filhos de filiados ao SINDPRF-CE. 50% de desconto na 1ª mensalidade para novatos e 20% de desconto nas parcelas mensais. Endereço: R. Jornalista Nertan Macêdo, 35 — Cocó, Fortaleza/CE. Consulte regras e condições.',
    link: null,
    contato: null,
  },
  {
    nome: 'Escola SESI SENAI Ceará',
    logoArquivo: 'sesi-senai-ceara.png',
    descricao:
      'Condições especiais em educação, tecnologia e inovação para filhos de filiados ao SINDPRF-CE. Unidades em Fortaleza, Horizonte, Maracanaú, Sobral e Juazeiro do Norte. Consulte unidades, regras e condições.',
    link: 'https://www.sesi-ce.org.br/',
    contato: null,
  },
  {
    nome: 'Unifametro',
    logoArquivo: 'unifametro.png',
    descricao:
      'Benefício para associados e dependentes do SINDPRF-CE. 30% na graduação presencial; 25% na pós-graduação presencial; 20% em extensão, graduação e tecnólogo nas modalidades semipresencial e EAD. Rua Conselheiro Estelita, 500 — Centro, Fortaleza/CE. Tel.: (85) 3206-6400 / (85) 3022-7030. Site: unifametro.edu.br. Consulte regras e condições.',
    link: 'https://unifametro.edu.br/',
    contato: '(85) 3206-6400 / (85) 3022-7030',
  },
  {
    nome: 'UNI7',
    aliases: ['UNI7', 'Uni7'],
    logoArquivo: 'uni7.png',
    descricao:
      'Centro Universitário 7 de Setembro — benefício para associados e dependentes do SINDPRF-CE. 15% em graduação, pós-graduação e Escola de Negócios UNI7; 10% no curso de Direito. Rua Almirante Maximiano da Fonseca, 1395 — Luciano Cavalcante, Fortaleza/CE. Tel.: (85) 4006-7600. Site: uni7.edu.br. Consulte regras e condições.',
    link: 'https://www.uni7.edu.br/',
    contato: '(85) 4006-7600',
  },
  {
    nome: 'UniATENEU',
    logoArquivo: 'uniateneu.png',
    descricao:
      'Benefício para associados e dependentes do SINDPRF-CE em todas as unidades. 35% em graduação e tecnólogo; 40% em pós-graduação; ou 5% adicional sobre campanha vigente. Contato: Vanessa — WhatsApp (85) 99256-2182. Site: uniateneu.edu.br. Consulte regras e condições.',
    link: 'https://uniateneu.edu.br/',
    contato: 'Vanessa — (85) 99256-2182',
  },
  {
    nome: 'Faculdade CDL',
    logoArquivo: 'faculdade-cdl.png',
    descricao:
      'Benefício para associados e dependentes do SINDPRF-CE. 40% no curso de Direito; 20% em Gestão de Segurança Pública e Privada; 30% em pós-graduação; 25% em cursos de curta duração; 10% em extensão e graduação. Rua 25 de Março, 882 — Centro, Fortaleza/CE. Tel.: (85) 3771-0750. Site: faculdadecdl.edu.br. Consulte regras e condições.',
    link: 'https://faculdadecdl.edu.br/',
    contato: '(85) 3771-0750',
  },
  {
    nome: 'Faculdade Luciano Feijão',
    logoArquivo: 'faculdade-luciano-feijao.png',
    descricao:
      'Descontos exclusivos nas mensalidades para associados e dependentes legais do SINDPRF-CE, além de apoio a eventos corporativos com palestrantes. Av. Dom José, 325 — Centro, Sobral/CE. Tel.: (88) 3112-1000. Instagram: @flfeijao. Consulte regras e condições.',
    link: null,
    contato: '(88) 3112-1000',
  },
  {
    nome: 'Unifor',
    aliases: ['UNIFOR', 'Unifor'],
    logoArquivo: 'unifor.png',
    descricao:
      '20% de desconto em graduação e pós-graduação (exceto Medicina) para associados e dependentes de 1º grau do SINDPRF-CE. Contato: Sávio Silva (85) 99198-1279; (85) 3477-3000; WhatsApp (85) 99246-6625. Consulte regras e condições.',
    link: 'https://www.unifor.br/',
    contato: 'Sávio Silva — (85) 99198-1279 / (85) 3477-3000 / WhatsApp (85) 99246-6625',
  },
  {
    nome: 'Estácio',
    logoArquivo: 'estacio.png',
    descricao:
      'Centro Universitário Estácio de Sá – FIC. 50% de desconto em extensão e pós-graduação para associados e dependentes do SINDPRF-CE. Site: portal.estacio.br. Consulte regras e condições.',
    link: 'https://portal.estacio.br/',
    contato: null,
  },
  {
    nome: 'UniC - Centro Universitário Cearense',
    logoArquivo: 'unic.png',
    descricao:
      'Benefício para associados e dependentes do SINDPRF-CE. 12% de desconto no período diurno e 10% no período noturno. Av. João Pessoa, 3884 — Damas, Fortaleza/CE. Tel.: (85) 3201-7000. Site: faculdadescearenses.edu.br. Consulte regras e condições.',
    link: 'https://faculdadescearenses.edu.br/',
    contato: '(85) 3201-7000',
  },
  {
    nome: 'Invictus Idiomas',
    logoArquivo: 'invictus-idiomas.png',
    descricao:
      '40% de desconto em cursos de idiomas (presencial e on-line) para associados e dependentes do SINDPRF-CE. Unidades: Cidade dos Funcionários, Bairro de Fátima, Aldeota e Parquelândia. Contato: Rafael — (85) 9975-0779. Consulte regras e condições.',
    link: null,
    contato: 'Rafael — (85) 9975-0779',
  },
  {
    nome: 'D. Pedro Livraria & Papelaria',
    logoArquivo: 'd-pedro-livraria.png',
    descricao:
      'Benefício para associados e dependentes do SINDPRF-CE. 10% em livros didáticos e 15% em materiais escolares. Av. Washington Soares, 3636 — Parque Manibura, Fortaleza/CE. Tel.: (85) 3488-3400. Consulte regras e condições.',
    link: null,
    contato: '(85) 3488-3400',
  },
];

async function copiarLogo(tenantId: string, arquivo: string): Promise<string> {
  const origem = join(LOGOS_DIR, arquivo);
  const pasta = join(UPLOADS_DIR, tenantId);
  await mkdir(pasta, { recursive: true });
  const destinoNome = `${randomBytes(12).toString('hex')}-${basename(arquivo)}`;
  const destino = join(pasta, destinoNome);
  await copyFile(origem, destino);
  return `/uploads/${tenantId}/${destinoNome}`;
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
  console.log(`Tenant: ${tenant.nome} (${tenant.id})`);
  console.log(`Logos:  ${LOGOS_DIR}\n`);

  for (const item of CONVENIOS) {
    console.log(`→ ${item.nome}`);
    const logoUrl = await copiarLogo(tenant.id, item.logoArquivo);
    const existente = await encontrarExistente(tenant.id, item);

    const dados = {
      nome: item.nome,
      categoria: 'Educação',
      descricao: item.descricao,
      link: item.link,
      contato: item.contato,
      logoUrl,
      ativo: true,
      vigenciaInicio: new Date('2026-01-01T00:00:00.000Z'),
    };

    if (existente) {
      await prisma.convenio.update({
        where: { id: existente.id },
        data: {
          ...dados,
          // preserva emissão de declaração já configurada (UNI7 / Unifor)
          emiteDeclaracao: existente.emiteDeclaracao,
          modeloDeclaracao: existente.modeloDeclaracao,
          destinoDeclaracao: existente.destinoDeclaracao,
          textoComplementar: existente.textoComplementar,
        },
      });
      console.log(`  atualizado (${existente.nome}) → logo ${logoUrl}`);
    } else {
      await prisma.convenio.create({
        data: {
          tenantId: tenant.id,
          ...dados,
          emiteDeclaracao: false,
          modeloDeclaracao: null,
          destinoDeclaracao: null,
          textoComplementar: null,
        },
      });
      console.log(`  criado → logo ${logoUrl}`);
    }
  }

  const educacao = await prisma.convenio.findMany({
    where: { tenantId: tenant.id, categoria: 'Educação', ativo: true },
    orderBy: { nome: 'asc' },
    select: { nome: true, contato: true, logoUrl: true, emiteDeclaracao: true },
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
