-- AlterTable
ALTER TABLE "noticias" ADD COLUMN "resumo" TEXT NOT NULL DEFAULT '';

-- Backfill: texto plano curto a partir do HTML (aproximação SQL do resumoDeConteudo)
UPDATE "noticias"
SET "resumo" = LEFT(
  TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE("conteudo", '<[^>]*>', ' ', 'g'),
      '\s+',
      ' ',
      'g'
    )
  ),
  180
);

-- CreateIndex
CREATE INDEX "afiliados_tenantId_status_idx" ON "afiliados"("tenantId", "status");

-- CreateIndex
CREATE INDEX "afiliados_tenantId_nome_idx" ON "afiliados"("tenantId", "nome");
