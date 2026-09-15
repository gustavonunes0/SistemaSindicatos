-- Destaques da home: notícias e posts do Instagram marcados pelo admin.

ALTER TABLE "noticias" ADD COLUMN "destaque" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "noticias_tenantId_destaque_publicadoEm_idx"
  ON "noticias"("tenantId", "destaque", "publicadoEm" DESC);

ALTER TABLE "instagram_posts" ADD COLUMN "destaque" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "instagram_posts_tenantId_destaque_publicadoEm_idx"
  ON "instagram_posts"("tenantId", "destaque", "publicadoEm" DESC);
