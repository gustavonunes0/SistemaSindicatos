-- CreateEnum
CREATE TYPE "PublicoAlerta" AS ENUM ('TODOS', 'FILIADOS');

-- CreateTable
CREATE TABLE "alertas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "imagemUrl" TEXT,
    "linkUrl" TEXT,
    "linkTexto" TEXT,
    "publico" "PublicoAlerta" NOT NULL DEFAULT 'TODOS',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "inicioEm" TIMESTAMPTZ NOT NULL,
    "fimEm" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alertas_tenantId_ativo_inicioEm_fimEm_idx" ON "alertas"("tenantId", "ativo", "inicioEm", "fimEm");

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
