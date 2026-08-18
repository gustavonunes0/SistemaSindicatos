-- CreateEnum
CREATE TYPE "PublicoFormulario" AS ENUM ('TODOS', 'FILIADOS');

-- CreateEnum
CREATE TYPE "StatusFormulario" AS ENUM ('RASCUNHO', 'PUBLICADO', 'ENCERRADO');

-- CreateTable
CREATE TABLE "formularios" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "campos" JSONB NOT NULL DEFAULT '[]',
    "publico" "PublicoFormulario" NOT NULL DEFAULT 'FILIADOS',
    "status" "StatusFormulario" NOT NULL DEFAULT 'RASCUNHO',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "formularios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respostas_formulario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "formularioId" TEXT NOT NULL,
    "afiliadoId" TEXT,
    "valores" JSONB NOT NULL DEFAULT '[]',
    "enviadoEm" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respostas_formulario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "formularios_tenantId_status_idx" ON "formularios"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "formularios_tenantId_slug_key" ON "formularios"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "respostas_formulario_tenantId_formularioId_enviadoEm_idx" ON "respostas_formulario"("tenantId", "formularioId", "enviadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "respostas_formulario_formularioId_afiliadoId_key" ON "respostas_formulario"("formularioId", "afiliadoId");

-- AddForeignKey
ALTER TABLE "formularios" ADD CONSTRAINT "formularios_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas_formulario" ADD CONSTRAINT "respostas_formulario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas_formulario" ADD CONSTRAINT "respostas_formulario_formularioId_fkey" FOREIGN KEY ("formularioId") REFERENCES "formularios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas_formulario" ADD CONSTRAINT "respostas_formulario_afiliadoId_fkey" FOREIGN KEY ("afiliadoId") REFERENCES "afiliados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
