/**
 * Normaliza categorias antigas para as 4 oficiais do site.
 *
 * Uso: npx tsx scripts/normalizar-categorias-convenios.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_SLUG = 'sindprf-ce';

const CATEGORIAS_OFICIAIS = [
  'Educação',
  'Saúde',
  'Esporte e Lazer',
  'Serviços e Facilidades',
] as const;

function normalizar(categoria: string): (typeof CATEGORIAS_OFICIAIS)[number] {
  const chave = categoria
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (chave.includes('educ')) return 'Educação';
  if (chave.includes('saud') || chave.includes('odonto') || chave.includes('medic')) {
    return 'Saúde';
  }
  if (
    chave.includes('lazer') ||
    chave.includes('esporte') ||
    chave.includes('hotel') ||
    chave.includes('turismo')
  ) {
    return 'Esporte e Lazer';
  }
  return 'Serviços e Facilidades';
}

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: TENANT_SLUG } });
  const lista = await prisma.convenio.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, nome: true, categoria: true },
  });

  for (const item of lista) {
    const nova = normalizar(item.categoria);
    if (nova === item.categoria) continue;
    await prisma.convenio.update({ where: { id: item.id }, data: { categoria: nova } });
    console.log(`${item.nome}: "${item.categoria}" → "${nova}"`);
  }

  const resumo = await prisma.convenio.groupBy({
    by: ['categoria'],
    where: { tenantId: tenant.id, ativo: true },
    _count: true,
  });
  console.table(resumo);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
