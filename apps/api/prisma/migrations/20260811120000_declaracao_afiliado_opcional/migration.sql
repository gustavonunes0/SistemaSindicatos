-- AlterTable
ALTER TABLE "declaracoes_emitidas" DROP CONSTRAINT "declaracoes_emitidas_afiliadoId_fkey";

-- AlterTable
ALTER TABLE "declaracoes_emitidas" ALTER COLUMN "afiliadoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "declaracoes_emitidas" ADD CONSTRAINT "declaracoes_emitidas_afiliadoId_fkey" FOREIGN KEY ("afiliadoId") REFERENCES "afiliados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
