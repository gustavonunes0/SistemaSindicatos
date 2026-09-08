CREATE TYPE "InstituicaoFinanceira" AS ENUM ('SICOOB', 'SICREDI');
CREATE TYPE "TipoDocumentoFinanceiro" AS ENUM ('EXTRATO', 'FATURA');
CREATE TYPE "TipoLancamentoFinanceiro" AS ENUM ('CREDITO', 'DEBITO');
CREATE TYPE "StatusValidacaoSaldo" AS ENUM ('VALIDO', 'DIVERGENTE', 'NAO_APLICAVEL');

CREATE TABLE "contas_financeiras" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instituicao" "InstituicaoFinanceira" NOT NULL,
    "agencia" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "titularNome" TEXT,
    "titularDocumento" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "contas_financeiras_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "importacoes_financeiras" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "instituicao" "InstituicaoFinanceira" NOT NULL,
    "tipoDocumento" "TipoDocumentoFinanceiro" NOT NULL,
    "layout" TEXT NOT NULL,
    "arquivoNome" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "competenciaAno" INTEGER NOT NULL,
    "competenciaMes" INTEGER NOT NULL,
    "periodoInicio" DATE NOT NULL,
    "periodoFim" DATE NOT NULL,
    "vencimento" DATE,
    "totalDocumento" DECIMAL(14,2),
    "saldoInicial" DECIMAL(14,2),
    "saldoFinal" DECIMAL(14,2),
    "totalCreditos" DECIMAL(14,2) NOT NULL,
    "totalDebitos" DECIMAL(14,2) NOT NULL,
    "statusValidacaoSaldo" "StatusValidacaoSaldo" NOT NULL,
    "totalLancamentos" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "importacoes_financeiras_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lancamentos_financeiros" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "importacaoId" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "sequencia" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL,
    "documento" TEXT,
    "tipo" "TipoLancamentoFinanceiro" NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "saldoApos" DECIMAL(14,2),
    "contraparteNome" TEXT,
    "contraparteDocumento" TEXT,
    "portadorNome" TEXT,
    "cartaoFinal" TEXT,
    "parcelaNumero" INTEGER,
    "parcelaTotal" INTEGER,
    "fingerprint" TEXT NOT NULL,
    CONSTRAINT "lancamentos_financeiros_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contas_financeiras_tenantId_instituicao_agencia_numero_key"
ON "contas_financeiras"("tenantId", "instituicao", "agencia", "numero");
CREATE INDEX "contas_financeiras_tenantId_ativo_idx" ON "contas_financeiras"("tenantId", "ativo");
CREATE UNIQUE INDEX "importacoes_financeiras_tenantId_sha256_key"
ON "importacoes_financeiras"("tenantId", "sha256");
CREATE UNIQUE INDEX "import_fin_conta_tipo_comp_key"
ON "importacoes_financeiras"("tenantId", "contaId", "tipoDocumento", "competenciaAno", "competenciaMes");
CREATE INDEX "importacoes_financeiras_tenantId_createdAt_idx"
ON "importacoes_financeiras"("tenantId", "createdAt");
CREATE INDEX "importacoes_financeiras_tenantId_contaId_periodoInicio_idx"
ON "importacoes_financeiras"("tenantId", "contaId", "periodoInicio");
CREATE UNIQUE INDEX "lancamentos_financeiros_tenantId_contaId_fingerprint_key"
ON "lancamentos_financeiros"("tenantId", "contaId", "fingerprint");
CREATE UNIQUE INDEX "lancamentos_financeiros_importacaoId_sequencia_key"
ON "lancamentos_financeiros"("importacaoId", "sequencia");
CREATE INDEX "lancamentos_financeiros_tenantId_contaId_data_idx"
ON "lancamentos_financeiros"("tenantId", "contaId", "data");
CREATE INDEX "lancamentos_financeiros_importacaoId_idx"
ON "lancamentos_financeiros"("importacaoId");

ALTER TABLE "contas_financeiras"
ADD CONSTRAINT "contas_financeiras_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "importacoes_financeiras"
ADD CONSTRAINT "importacoes_financeiras_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "importacoes_financeiras"
ADD CONSTRAINT "importacoes_financeiras_contaId_fkey"
FOREIGN KEY ("contaId") REFERENCES "contas_financeiras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lancamentos_financeiros"
ADD CONSTRAINT "lancamentos_financeiros_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lancamentos_financeiros"
ADD CONSTRAINT "lancamentos_financeiros_importacaoId_fkey"
FOREIGN KEY ("importacaoId") REFERENCES "importacoes_financeiras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lancamentos_financeiros"
ADD CONSTRAINT "lancamentos_financeiros_contaId_fkey"
FOREIGN KEY ("contaId") REFERENCES "contas_financeiras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
