/**
 * Define a senha de todos os afiliados como a própria matrícula.
 *
 * Uso (em apps/api): npx tsx --env-file=.env scripts/reset-senhas-matricula.ts
 */
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const BCRYPT_ROUNDS = 10;

async function main() {
  const prisma = new PrismaClient();
  try {
    const afiliados = await prisma.afiliado.findMany({
      select: { id: true, userId: true, nome: true, matricula: true },
    });

    console.log(`Atualizando senha de ${afiliados.length} afiliados…`);
    let ok = 0;
    const erros: string[] = [];

    for (let i = 0; i < afiliados.length; i += 1) {
      const a = afiliados[i]!;
      try {
        const senhaHash = await bcrypt.hash(a.matricula, BCRYPT_ROUNDS);
        await prisma.user.update({
          where: { id: a.userId },
          data: { senhaHash },
        });
        ok += 1;
      } catch (erro) {
        erros.push(`${a.nome}: ${(erro as Error).message}`);
      }
      if ((i + 1) % 50 === 0 || i + 1 === afiliados.length) {
        console.log(`Progresso: ${i + 1}/${afiliados.length}`);
      }
    }

    console.log(JSON.stringify({ atualizados: ok, erros: erros.length, amostraErros: erros.slice(0, 5) }));
  } finally {
    await prisma.$disconnect();
  }
}

void main();
