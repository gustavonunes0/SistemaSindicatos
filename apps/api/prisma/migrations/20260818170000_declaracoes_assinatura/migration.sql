-- CreateEnum
CREATE TYPE "StatusDeclaracao" AS ENUM ('PENDENTE', 'ASSINADA');

-- AlterTable
ALTER TABLE "declaracoes_emitidas"
  ADD COLUMN "status" "StatusDeclaracao" NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN "arquivoUrl" TEXT,
  ADD COLUMN "arquivoAssinadoUrl" TEXT,
  ADD COLUMN "assinadaEm" TIMESTAMPTZ,
  ADD COLUMN "assinadaPorId" TEXT;

-- CreateIndex
CREATE INDEX "declaracoes_emitidas_tenantId_status_emitidaEm_idx" ON "declaracoes_emitidas"("tenantId", "status", "emitidaEm");

-- AddForeignKey
ALTER TABLE "declaracoes_emitidas" ADD CONSTRAINT "declaracoes_emitidas_assinadaPorId_fkey" FOREIGN KEY ("assinadaPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
