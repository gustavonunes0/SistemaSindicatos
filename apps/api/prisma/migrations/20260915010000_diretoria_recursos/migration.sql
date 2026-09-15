-- Diretoria: marcar afiliados e recursos exclusivos.

ALTER TABLE "afiliados" ADD COLUMN "diretor" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "afiliados_tenantId_diretor_idx" ON "afiliados"("tenantId", "diretor");

ALTER TYPE "PublicoFormulario" ADD VALUE 'DIRETORIA';

CREATE TABLE "recursos_diretoria" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "descricao" TEXT,
  "url" TEXT NOT NULL,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "recursos_diretoria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recursos_diretoria_tenantId_ativo_ordem_idx"
  ON "recursos_diretoria"("tenantId", "ativo", "ordem");

ALTER TABLE "recursos_diretoria"
  ADD CONSTRAINT "recursos_diretoria_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
