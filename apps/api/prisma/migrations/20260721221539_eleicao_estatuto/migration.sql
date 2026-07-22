-- CreateEnum
CREATE TYPE "ChapaStatus" AS ENUM ('INSCRITA', 'HOMOLOGADA', 'NAO_HOMOLOGADA');

-- CreateEnum
CREATE TYPE "TipoContestacao" AS ENUM ('IMPUGNACAO', 'RECURSO');

-- CreateEnum
CREATE TYPE "StatusContestacao" AS ENUM ('ABERTA', 'DEFERIDA', 'INDEFERIDA');

-- AlterTable
ALTER TABLE "chapas" ADD COLUMN     "homologadaEm" TIMESTAMPTZ,
ADD COLUMN     "justificativaHomologacao" TEXT,
ADD COLUMN     "prazoContestacaoFim" TIMESTAMPTZ,
ADD COLUMN     "status" "ChapaStatus" NOT NULL DEFAULT 'INSCRITA';

-- AlterTable
ALTER TABLE "eleicoes" ADD COLUMN     "inscricaoFim" TIMESTAMPTZ,
ADD COLUMN     "inscricaoInicio" TIMESTAMPTZ,
ADD COLUMN     "resolvidaPorAclamacao" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "resultados_apuracao" ADD COLUMN     "porAclamacao" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "membros_comissao_eleitoral" (
    "id" TEXT NOT NULL,
    "eleicaoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titular" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membros_comissao_eleitoral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contestacoes_chapa" (
    "id" TEXT NOT NULL,
    "chapaId" TEXT NOT NULL,
    "tipo" "TipoContestacao" NOT NULL,
    "afiliadoId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" "StatusContestacao" NOT NULL DEFAULT 'ABERTA',
    "decisao" TEXT,
    "decididoPorUserId" TEXT,
    "decididoEm" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contestacoes_chapa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membros_comissao_eleitoral_eleicaoId_idx" ON "membros_comissao_eleitoral"("eleicaoId");

-- CreateIndex
CREATE UNIQUE INDEX "membros_comissao_eleitoral_eleicaoId_userId_key" ON "membros_comissao_eleitoral"("eleicaoId", "userId");

-- CreateIndex
CREATE INDEX "contestacoes_chapa_chapaId_idx" ON "contestacoes_chapa"("chapaId");

-- AddForeignKey
ALTER TABLE "membros_comissao_eleitoral" ADD CONSTRAINT "membros_comissao_eleitoral_eleicaoId_fkey" FOREIGN KEY ("eleicaoId") REFERENCES "eleicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_comissao_eleitoral" ADD CONSTRAINT "membros_comissao_eleitoral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contestacoes_chapa" ADD CONSTRAINT "contestacoes_chapa_chapaId_fkey" FOREIGN KEY ("chapaId") REFERENCES "chapas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contestacoes_chapa" ADD CONSTRAINT "contestacoes_chapa_afiliadoId_fkey" FOREIGN KEY ("afiliadoId") REFERENCES "afiliados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contestacoes_chapa" ADD CONSTRAINT "contestacoes_chapa_decididoPorUserId_fkey" FOREIGN KEY ("decididoPorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
