CREATE TYPE "EstadoCivil" AS ENUM (
  'SOLTEIRO',
  'CASADO',
  'UNIAO_ESTAVEL',
  'SEPARADO',
  'DIVORCIADO',
  'VIUVO'
);

ALTER TABLE "afiliados"
  ADD COLUMN "dataNascimento" DATE,
  ADD COLUMN "rg" TEXT,
  ADD COLUMN "orgaoExpedidor" TEXT,
  ADD COLUMN "naturalidade" TEXT,
  ADD COLUMN "estadoCivil" "EstadoCivil",
  ADD COLUMN "nomeMae" TEXT,
  ADD COLUMN "nomePai" TEXT,
  ADD COLUMN "conjuge" TEXT,
  ADD COLUMN "endereco" TEXT,
  ADD COLUMN "complemento" TEXT,
  ADD COLUMN "bairro" TEXT,
  ADD COLUMN "cidade" TEXT,
  ADD COLUMN "uf" VARCHAR(2),
  ADD COLUMN "cep" VARCHAR(8),
  ADD COLUMN "lotacaoSiape" TEXT,
  ADD COLUMN "lotacaoAtividade" TEXT,
  ADD COLUMN "dataAdmissao" DATE,
  ADD COLUMN "celular" TEXT,
  ADD COLUMN "celular2" TEXT,
  ADD COLUMN "emailFuncional" TEXT,
  ADD COLUMN "aceiteEstatutoEm" TIMESTAMPTZ;

CREATE TABLE "dependentes_afiliado" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "afiliadoId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "parentesco" TEXT NOT NULL,
  "dataNascimento" DATE NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dependentes_afiliado_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dependentes_afiliado_tenantId_afiliadoId_idx"
  ON "dependentes_afiliado"("tenantId", "afiliadoId");

ALTER TABLE "dependentes_afiliado"
  ADD CONSTRAINT "dependentes_afiliado_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dependentes_afiliado"
  ADD CONSTRAINT "dependentes_afiliado_afiliadoId_fkey"
  FOREIGN KEY ("afiliadoId") REFERENCES "afiliados"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
