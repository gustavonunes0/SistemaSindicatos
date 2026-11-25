-- AlterEnum
ALTER TYPE "StatusSolicitacao" ADD VALUE IF NOT EXISTS 'APROVADA';
ALTER TYPE "StatusSolicitacao" ADD VALUE IF NOT EXISTS 'RECUSADA';

-- AlterTable
ALTER TABLE "solicitacoes_aluguel" ADD COLUMN "periodoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "solicitacoes_aluguel_periodoId_key" ON "solicitacoes_aluguel"("periodoId");

-- AddForeignKey
ALTER TABLE "solicitacoes_aluguel" ADD CONSTRAINT "solicitacoes_aluguel_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
