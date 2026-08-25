CREATE TYPE "TipoDocumentoFiliacao" AS ENUM (
  'IDENTIDADE_CPF',
  'COMPROVANTE_ENDERECO',
  'CONTRACHEQUE',
  'FOTO_3X4'
);

CREATE TABLE "documentos_afiliado" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "afiliadoId" TEXT NOT NULL,
  "tipo" "TipoDocumentoFiliacao" NOT NULL,
  "arquivoChave" TEXT NOT NULL,
  "nomeOriginal" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "tamanhoBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "documentos_afiliado_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "documentos_afiliado_tenantId_afiliadoId_tipo_key"
  ON "documentos_afiliado"("tenantId", "afiliadoId", "tipo");

CREATE INDEX "documentos_afiliado_tenantId_afiliadoId_idx"
  ON "documentos_afiliado"("tenantId", "afiliadoId");

ALTER TABLE "documentos_afiliado"
  ADD CONSTRAINT "documentos_afiliado_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documentos_afiliado"
  ADD CONSTRAINT "documentos_afiliado_afiliadoId_fkey"
  FOREIGN KEY ("afiliadoId") REFERENCES "afiliados"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
