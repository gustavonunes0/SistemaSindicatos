/**
 * Remove o último dígito da matrícula de todos os afiliados e redefine
 * a senha do usuário como a nova matrícula.
 *
 * Uso (em apps/api):
 *   npx tsx --env-file=.env scripts/remover-digito-matricula.ts
 *   npx tsx --env-file=.env scripts/remover-digito-matricula.ts --dry-run
 */
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const BCRYPT_ROUNDS = 10;
const DRY_RUN = process.argv.includes('--dry-run');

function novaMatricula(atual: string): string | null {
  const m = atual.trim();
  if (m.length < 2) return null;
  // Só remove se o último caractere for dígito (evita alterar matrículas já migradas)
  if (!/\d$/.test(m)) return null;
  return m.slice(0, -1);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const afiliados = await prisma.afiliado.findMany({
      select: {
        id: true,
        userId: true,
        tenantId: true,
        nome: true,
        matricula: true,
      },
      orderBy: { matricula: 'asc' },
    });

    console.log(
      `${DRY_RUN ? '[DRY-RUN] ' : ''}Processando ${afiliados.length} afiliados…`,
    );

    type Plano = {
      id: string;
      userId: string;
      tenantId: string;
      nome: string;
      de: string;
      para: string;
    };

    const planos: Plano[] = [];
    const pulados: string[] = [];

    for (const a of afiliados) {
      const para = novaMatricula(a.matricula);
      if (!para || para === a.matricula) {
        pulados.push(`${a.nome} (${a.matricula}) — sem alteração`);
        continue;
      }
      planos.push({
        id: a.id,
        userId: a.userId,
        tenantId: a.tenantId,
        nome: a.nome,
        de: a.matricula,
        para,
      });
    }

    // Detecta colisões no mesmo tenant (duas matrículas virando a mesma)
    const porTenant = new Map<string, Map<string, Plano[]>>();
    for (const p of planos) {
      let mapa = porTenant.get(p.tenantId);
      if (!mapa) {
        mapa = new Map();
        porTenant.set(p.tenantId, mapa);
      }
      const lista = mapa.get(p.para) ?? [];
      lista.push(p);
      mapa.set(p.para, lista);
    }

    const conflitos: string[] = [];
    for (const [tenantId, mapa] of porTenant) {
      for (const [mat, lista] of mapa) {
        if (lista.length > 1) {
          conflitos.push(
            `tenant ${tenantId}: "${mat}" ← ${lista.map((x) => x.de).join(', ')}`,
          );
        }
        // Também conflita se a nova matrícula já existe e não será alterada neste lote
        const existente = afiliados.find(
          (a) =>
            a.tenantId === tenantId &&
            a.matricula === mat &&
            !planos.some((p) => p.id === a.id),
        );
        if (existente) {
          conflitos.push(
            `tenant ${tenantId}: "${mat}" já existe (${existente.nome}) e seria alvo de ${lista.map((x) => x.de).join(', ')}`,
          );
        }
      }
    }

    if (conflitos.length > 0) {
      console.error('Conflitos de matrícula — abortando:');
      for (const c of conflitos.slice(0, 20)) console.error(`  - ${c}`);
      if (conflitos.length > 20) console.error(`  … e mais ${conflitos.length - 20}`);
      process.exitCode = 1;
      return;
    }

    let ok = 0;
    const erros: string[] = [];

    for (let i = 0; i < planos.length; i += 1) {
      const p = planos[i]!;
      try {
        if (!DRY_RUN) {
          const senhaHash = await bcrypt.hash(p.para, BCRYPT_ROUNDS);
          await prisma.$transaction([
            prisma.afiliado.update({
              where: { id: p.id },
              data: { matricula: p.para },
            }),
            prisma.user.update({
              where: { id: p.userId },
              data: { senhaHash },
            }),
          ]);
        }
        ok += 1;
      } catch (erro) {
        erros.push(`${p.nome} (${p.de}→${p.para}): ${(erro as Error).message}`);
      }

      if ((i + 1) % 50 === 0 || i + 1 === planos.length) {
        console.log(`Progresso: ${i + 1}/${planos.length}`);
      }
    }

    console.log(
      JSON.stringify(
        {
          dryRun: DRY_RUN,
          candidatos: planos.length,
          atualizados: ok,
          pulados: pulados.length,
          erros: erros.length,
          amostra: planos.slice(0, 5).map((p) => `${p.de} → ${p.para}`),
          amostraErros: erros.slice(0, 5),
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
