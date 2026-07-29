-- CreateEnum
CREATE TYPE "TipoLinhaBalancete" AS ENUM ('ATIVO', 'PASSIVO', 'RECEITA', 'DESPESA', 'OUTRO');

-- CreateEnum
CREATE TYPE "NaturezaConta" AS ENUM ('D', 'C');

-- CreateTable
CREATE TABLE "importacoes_balancete" (
    "id" TEXT NOT NULL,
    "competenciaAno" INTEGER NOT NULL,
    "competenciaMes" INTEGER NOT NULL,
    "arquivoNome" TEXT NOT NULL,
    "totalLinhas" INTEGER NOT NULL,
    "totalReceitas" DECIMAL(14,2) NOT NULL,
    "totalDespesas" DECIMAL(14,2) NOT NULL,
    "resultado" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importacoes_balancete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linhas_balancete" (
    "id" TEXT NOT NULL,
    "importacaoId" TEXT NOT NULL,
    "sequencia" INTEGER NOT NULL,
    "codigoConta" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "tipo" "TipoLinhaBalancete" NOT NULL,
    "natureza" "NaturezaConta",
    "saldoAnterior" DECIMAL(14,2) NOT NULL,
    "debitos" DECIMAL(14,2) NOT NULL,
    "creditos" DECIMAL(14,2) NOT NULL,
    "saldoAtual" DECIMAL(14,2) NOT NULL,
    "movimento" DECIMAL(14,2) NOT NULL,
    "categoriaSlug" TEXT,
    "categoriaNome" TEXT,
    "ehFolha" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "linhas_balancete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "importacoes_balancete_competenciaAno_competenciaMes_idx" ON "importacoes_balancete"("competenciaAno", "competenciaMes");

-- CreateIndex
CREATE UNIQUE INDEX "importacoes_balancete_competenciaAno_competenciaMes_key" ON "importacoes_balancete"("competenciaAno", "competenciaMes");

-- CreateIndex
CREATE INDEX "linhas_balancete_importacaoId_idx" ON "linhas_balancete"("importacaoId");

-- CreateIndex
CREATE INDEX "linhas_balancete_importacaoId_tipo_idx" ON "linhas_balancete"("importacaoId", "tipo");

-- CreateIndex
CREATE INDEX "linhas_balancete_importacaoId_categoriaSlug_idx" ON "linhas_balancete"("importacaoId", "categoriaSlug");

-- AddForeignKey
ALTER TABLE "linhas_balancete" ADD CONSTRAINT "linhas_balancete_importacaoId_fkey" FOREIGN KEY ("importacaoId") REFERENCES "importacoes_balancete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
