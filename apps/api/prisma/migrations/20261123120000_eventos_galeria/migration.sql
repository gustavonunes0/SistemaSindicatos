-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "local" TEXT,
    "dataEvento" DATE,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos_evento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nomeOriginal" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "fotos_evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_tenantId_ativo_idx" ON "eventos"("tenantId", "ativo");

-- CreateIndex
CREATE INDEX "eventos_tenantId_dataEvento_idx" ON "eventos"("tenantId", "dataEvento");

-- CreateIndex
CREATE INDEX "fotos_evento_eventoId_idx" ON "fotos_evento"("eventoId");

-- CreateIndex
CREATE INDEX "fotos_evento_tenantId_idx" ON "fotos_evento"("tenantId");

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos_evento" ADD CONSTRAINT "fotos_evento_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos_evento" ADD CONSTRAINT "fotos_evento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
