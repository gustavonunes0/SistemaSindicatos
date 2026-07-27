-- CreateEnum
CREATE TYPE "TipoD8" AS ENUM ('SERVIDOR', 'PENSIONISTA');

-- AlterTable
ALTER TABLE "afiliados" ADD COLUMN "categoria" "TipoD8";

-- CreateTable
CREATE TABLE "importacoes_d8" (
    "id" TEXT NOT NULL,
    "competenciaAno" INTEGER NOT NULL,
    "competenciaMes" INTEGER NOT NULL,
    "tipo" "TipoD8" NOT NULL,
    "arquivoNome" TEXT NOT NULL,
    "totalLinhas" INTEGER NOT NULL,
    "totalValor" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importacoes_d8_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linhas_d8" (
    "id" TEXT NOT NULL,
    "importacaoId" TEXT NOT NULL,
    "sequencia" INTEGER NOT NULL,
    "matricula" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "afiliadoId" TEXT,

    CONSTRAINT "linhas_d8_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "importacoes_d8_competenciaAno_competenciaMes_idx" ON "importacoes_d8"("competenciaAno", "competenciaMes");

-- CreateIndex
CREATE UNIQUE INDEX "importacoes_d8_competenciaAno_competenciaMes_tipo_key" ON "importacoes_d8"("competenciaAno", "competenciaMes", "tipo");

-- CreateIndex
CREATE INDEX "linhas_d8_importacaoId_idx" ON "linhas_d8"("importacaoId");

-- CreateIndex
CREATE INDEX "linhas_d8_cpf_idx" ON "linhas_d8"("cpf");

-- CreateIndex
CREATE INDEX "linhas_d8_matricula_idx" ON "linhas_d8"("matricula");

-- CreateIndex
CREATE INDEX "linhas_d8_afiliadoId_idx" ON "linhas_d8"("afiliadoId");

-- AddForeignKey
ALTER TABLE "linhas_d8" ADD CONSTRAINT "linhas_d8_importacaoId_fkey" FOREIGN KEY ("importacaoId") REFERENCES "importacoes_d8"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linhas_d8" ADD CONSTRAINT "linhas_d8_afiliadoId_fkey" FOREIGN KEY ("afiliadoId") REFERENCES "afiliados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
