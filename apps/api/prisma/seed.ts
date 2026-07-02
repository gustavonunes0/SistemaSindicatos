import { PrismaClient, Role } from '@prisma/client';
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

  console.log(`Seed ok: admin ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
