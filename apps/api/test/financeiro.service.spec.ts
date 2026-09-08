import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service';
import { FinanceiroService } from '../src/financeiro/financeiro.service';
import { runWithTenantAsync } from '../src/tenant/tenant-context';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TENANT = {
  tenantId: 'tenant-financeiro',
  slug: 'teste',
  host: 'teste.local',
  timezone: 'America/Fortaleza',
  nome: 'Tenant teste',
};

function fixture(nome: string): string {
  return readFileSync(join(__dirname, 'fixtures', 'financeiro', nome), 'utf8');
}

function criarTransacao(existente: { id: string } | null = null) {
  const conta = {
    id: 'conta-1',
    tenantId: TENANT.tenantId,
    instituicao: 'SICOOB' as const,
    agencia: '3357-0',
    numero: '12308-0',
    nome: 'Conta 12308-0',
    titularNome: null,
    titularDocumento: null,
    ativo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const importacao = {
    id: 'importacao-1',
    tenantId: TENANT.tenantId,
    contaId: conta.id,
    instituicao: 'SICOOB' as const,
    tipoDocumento: 'EXTRATO' as const,
    layout: 'SICOOB_EXTRATO',
    arquivoNome: 'extrato.pdf',
    sha256: 'a'.repeat(64),
    competenciaAno: 2026,
    competenciaMes: 1,
    periodoInicio: new Date('2026-01-01T00:00:00.000Z'),
    periodoFim: new Date('2026-01-31T00:00:00.000Z'),
    vencimento: null,
    totalDocumento: null,
    saldoInicial: 1000,
    saldoFinal: 1150,
    totalCreditos: 200,
    totalDebitos: 50,
    statusValidacaoSaldo: 'VALIDO' as const,
    totalLancamentos: 2,
    createdAt: new Date(),
  };
  const tx = {
    contaFinanceira: {
      findFirst: jest.fn().mockResolvedValue(conta),
      upsert: jest.fn().mockResolvedValue(conta),
    },
    importacaoFinanceira: {
      findUnique: jest
        .fn()
        .mockResolvedValueOnce(existente)
        .mockResolvedValueOnce(null),
      delete: jest.fn().mockResolvedValue(existente),
      create: jest.fn().mockImplementation(({ data }: { data: object }) =>
        Promise.resolve({ ...importacao, ...data }),
      ),
    },
    lancamentoFinanceiro: {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
  };
  return { tx, conta };
}

describe('FinanceiroService', () => {
  it('importa em transação e sempre restringe a conta selecionada ao tenant', async () => {
    const { tx, conta } = criarTransacao();
    const prisma = {
      $transaction: jest.fn(
        async (executar: (cliente: typeof tx) => Promise<unknown>) => executar(tx),
      ),
    } as unknown as PrismaService;
    const service = new FinanceiroService(prisma);

    await runWithTenantAsync(TENANT, () =>
      service.importar({
        texto: fixture('sicoob-extrato.txt'),
        arquivoNome: 'extrato.pdf',
        contaId: conta.id,
        substituirExistente: false,
      }),
    );

    expect(tx.contaFinanceira.findFirst).toHaveBeenCalledWith({
      where: { id: conta.id, tenantId: TENANT.tenantId, ativo: true },
    });
    expect(tx.importacaoFinanceira.create).toHaveBeenCalledTimes(1);
    expect(tx.lancamentoFinanceiro.createMany).toHaveBeenCalledTimes(1);
  });

  it('exige confirmação antes de substituir a mesma competência', async () => {
    const { tx, conta } = criarTransacao({ id: 'anterior' });
    const prisma = {
      $transaction: jest.fn(
        async (executar: (cliente: typeof tx) => Promise<unknown>) => executar(tx),
      ),
    } as unknown as PrismaService;
    const service = new FinanceiroService(prisma);

    await expect(
      runWithTenantAsync(TENANT, () =>
        service.importar({
          texto: fixture('sicoob-extrato.txt'),
          arquivoNome: 'extrato.pdf',
          contaId: conta.id,
          substituirExistente: false,
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.importacaoFinanceira.delete).not.toHaveBeenCalled();
  });

  it('substitui a competência confirmada antes de inserir os novos lançamentos', async () => {
    const { tx, conta } = criarTransacao({ id: 'anterior' });
    const prisma = {
      $transaction: jest.fn(
        async (executar: (cliente: typeof tx) => Promise<unknown>) => executar(tx),
      ),
    } as unknown as PrismaService;
    const service = new FinanceiroService(prisma);

    await runWithTenantAsync(TENANT, () =>
      service.importar({
        texto: fixture('sicoob-extrato.txt'),
        arquivoNome: 'extrato.pdf',
        contaId: conta.id,
        substituirExistente: true,
      }),
    );

    expect(tx.importacaoFinanceira.delete).toHaveBeenCalledWith({
      where: { id: 'anterior' },
    });
    expect(tx.importacaoFinanceira.create).toHaveBeenCalledTimes(1);
  });
});
