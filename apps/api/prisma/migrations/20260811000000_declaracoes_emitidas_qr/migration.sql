-- CreateTable
CREATE TABLE "declaracoes_emitidas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "convenioId" TEXT NOT NULL,
    "afiliadoId" TEXT NOT NULL,
    "modelo" "ModeloDeclaracao" NOT NULL,
    "destino" TEXT NOT NULL,
    "textoComplementar" TEXT,
    "afiliadoNome" TEXT NOT NULL,
    "afiliadoCpf" TEXT NOT NULL,
    "dependenteNome" TEXT,
    "dependenteCpf" TEXT,
    "periodoInicio" TIMESTAMPTZ,
    "periodoFim" TIMESTAMPTZ,
    "emitidaEm" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "declaracoes_emitidas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "declaracoes_emitidas_tenantId_emitidaEm_idx" ON "declaracoes_emitidas"("tenantId", "emitidaEm");

-- CreateIndex
CREATE UNIQUE INDEX "declaracoes_emitidas_tenantId_codigo_key" ON "declaracoes_emitidas"("tenantId", "codigo");

-- AddForeignKey
ALTER TABLE "declaracoes_emitidas" ADD CONSTRAINT "declaracoes_emitidas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declaracoes_emitidas" ADD CONSTRAINT "declaracoes_emitidas_convenioId_fkey" FOREIGN KEY ("convenioId") REFERENCES "convenios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declaracoes_emitidas" ADD CONSTRAINT "declaracoes_emitidas_afiliadoId_fkey" FOREIGN KEY ("afiliadoId") REFERENCES "afiliados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
