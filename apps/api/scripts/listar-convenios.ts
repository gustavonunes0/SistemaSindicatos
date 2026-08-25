/**
 * Lista os convênios de um tenant, agrupados por categoria.
 *
 * Uso (apps/api):
 *   npx tsx scripts/listar-convenios.ts [categoria]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_SLUG = 'sindprf-ce';

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: TENANT_SLUG } });
  const categoria = process.argv[2];

  const convenios = await prisma.convenio.findMany({
    where: { tenantId: tenant.id, ...(categoria ? { categoria } : {}) },
    orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    select: { id: true, nome: true, categoria: true, ativo: true, logoUrl: true, link: true },
  });

  console.log(`Tenant: ${tenant.nome}`);
  console.log(`Convênios: ${convenios.length}\n`);
  console.table(
    convenios.map((c) => ({
      nome: c.nome,
      categoria: c.categoria,
      ativo: c.ativo,
      logo: c.logoUrl ? 'sim' : '—',
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
