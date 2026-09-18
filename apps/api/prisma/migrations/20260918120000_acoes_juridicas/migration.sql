-- CreateTable
CREATE TABLE "importacoes_acao_juridica" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "arquivoNome" TEXT NOT NULL,
    "totalLinhas" INTEGER NOT NULL,
    "novas" INTEGER NOT NULL DEFAULT 0,
    "atualizadas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importacoes_acao_juridica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acoes_juridicas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "importacaoId" TEXT NOT NULL,
    "sequencia" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "numeroAcao" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "afiliadoId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "acoes_juridicas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "importacoes_acao_juridica_tenantId_createdAt_idx" ON "importacoes_acao_juridica"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "acoes_juridicas_tenantId_numeroAcao_key" ON "acoes_juridicas"("tenantId", "numeroAcao");

-- CreateIndex
CREATE INDEX "acoes_juridicas_importacaoId_idx" ON "acoes_juridicas"("importacaoId");

-- CreateIndex
CREATE INDEX "acoes_juridicas_tenantId_cpf_idx" ON "acoes_juridicas"("tenantId", "cpf");

-- CreateIndex
CREATE INDEX "acoes_juridicas_tenantId_afiliadoId_idx" ON "acoes_juridicas"("tenantId", "afiliadoId");

-- AddForeignKey
ALTER TABLE "importacoes_acao_juridica" ADD CONSTRAINT "importacoes_acao_juridica_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoes_juridicas" ADD CONSTRAINT "acoes_juridicas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoes_juridicas" ADD CONSTRAINT "acoes_juridicas_importacaoId_fkey" FOREIGN KEY ("importacaoId") REFERENCES "importacoes_acao_juridica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoes_juridicas" ADD CONSTRAINT "acoes_juridicas_afiliadoId_fkey" FOREIGN KEY ("afiliadoId") REFERENCES "afiliados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
