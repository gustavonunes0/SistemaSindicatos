-- Estatutos sindicais (PDF) para acesso dos filiados.

CREATE TABLE "estatutos" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "arquivoChave" TEXT NOT NULL,
  "nomeOriginal" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
  "tamanhoBytes" INTEGER NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "estatutos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "estatutos_tenantId_ativo_ordem_idx"
  ON "estatutos"("tenantId", "ativo", "ordem");

ALTER TABLE "estatutos"
  ADD CONSTRAINT "estatutos_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
