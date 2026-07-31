-- CreateEnum
CREATE TYPE "ModeloDeclaracao" AS ENUM ('FILIADO', 'DEPENDENTE', 'AUTORIZACAO_HOSPEDAGEM');

-- AlterTable
ALTER TABLE "convenios" ADD COLUMN "emiteDeclaracao" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "convenios" ADD COLUMN "modeloDeclaracao" "ModeloDeclaracao";
ALTER TABLE "convenios" ADD COLUMN "destinoDeclaracao" TEXT;
ALTER TABLE "convenios" ADD COLUMN "textoComplementar" TEXT;
