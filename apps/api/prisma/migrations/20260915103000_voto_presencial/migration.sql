-- CreateEnum
CREATE TYPE "OrigemVoto" AS ENUM ('ELETRONICO', 'PRESENCIAL');

-- AlterTable
ALTER TABLE "votos" ADD COLUMN "origem" "OrigemVoto" NOT NULL DEFAULT 'ELETRONICO';

-- CreateIndex
CREATE INDEX "votos_eleicaoId_origem_idx" ON "votos"("eleicaoId", "origem");

-- AlterTable
ALTER TABLE "resultados_apuracao" ADD COLUMN "votosEletronicos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "resultados_apuracao" ADD COLUMN "votosPresenciais" INTEGER NOT NULL DEFAULT 0;
