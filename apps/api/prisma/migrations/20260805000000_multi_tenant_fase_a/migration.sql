-- Multi-tenant Fase A: Tenant + TenantDomain, tenantId em tabelas de negócio,
-- uniques compostos, backfill do tenant seed sindprf-ce.

-- 1) Tenants
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Fortaleza',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "branding" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

CREATE TABLE "tenant_domains" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "primario" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_domains_host_key" ON "tenant_domains"("host");
CREATE INDEX "tenant_domains_tenantId_idx" ON "tenant_domains"("tenantId");

ALTER TABLE "tenant_domains"
  ADD CONSTRAINT "tenant_domains_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed tenant (id fixo para backfill previsível)
INSERT INTO "tenants" ("id", "slug", "nome", "timezone", "ativo", "branding", "createdAt", "updatedAt")
VALUES (
  'tenant_sindprf_ce',
  'sindprf-ce',
  'Sindicato dos Policiais Rodoviários Federais no Estado do Ceará',
  'America/Fortaleza',
  true,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "tenant_domains" ("id", "tenantId", "host", "primario", "createdAt") VALUES
  ('td_sindprf_localhost', 'tenant_sindprf_ce', 'localhost', true, CURRENT_TIMESTAMP),
  ('td_sindprf_127', 'tenant_sindprf_ce', '127.0.0.1', false, CURRENT_TIMESTAMP);

-- 2) Colunas tenantId (nullable) nas tabelas de negócio
ALTER TABLE "users" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "password_reset_tokens" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "afiliados" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "importacoes_d8" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "linhas_d8" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "noticias" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "push_subscriptions" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "instagram_posts" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "convenios" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "eleicoes" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "membros_comissao_eleitoral" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "chapas" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "contestacoes_chapa" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "candidatos" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "elegiveis" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "comparecimentos" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "votos" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "resultados_apuracao" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "imoveis" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "fotos_imovel" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "periodos" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "solicitacoes_aluguel" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "mensagens" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "importacoes_balancete" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "linhas_balancete" ADD COLUMN "tenantId" TEXT;

-- 3) Backfill (tudo vira SINDPRF-CE)
UPDATE "users" SET "tenantId" = 'tenant_sindprf_ce';
UPDATE "afiliados" SET "tenantId" = 'tenant_sindprf_ce';
UPDATE "noticias" SET "tenantId" = 'tenant_sindprf_ce';
UPDATE "push_subscriptions" SET "tenantId" = 'tenant_sindprf_ce';
UPDATE "instagram_posts" SET "tenantId" = 'tenant_sindprf_ce';
UPDATE "convenios" SET "tenantId" = 'tenant_sindprf_ce';
UPDATE "eleicoes" SET "tenantId" = 'tenant_sindprf_ce';
UPDATE "imoveis" SET "tenantId" = 'tenant_sindprf_ce';
UPDATE "importacoes_d8" SET "tenantId" = 'tenant_sindprf_ce';
UPDATE "importacoes_balancete" SET "tenantId" = 'tenant_sindprf_ce';

UPDATE "refresh_tokens" r SET "tenantId" = u."tenantId" FROM "users" u WHERE r."userId" = u."id";
UPDATE "password_reset_tokens" t SET "tenantId" = u."tenantId" FROM "users" u WHERE t."userId" = u."id";

UPDATE "linhas_d8" l SET "tenantId" = i."tenantId" FROM "importacoes_d8" i WHERE l."importacaoId" = i."id";
UPDATE "linhas_balancete" l SET "tenantId" = i."tenantId" FROM "importacoes_balancete" i WHERE l."importacaoId" = i."id";

UPDATE "membros_comissao_eleitoral" m SET "tenantId" = e."tenantId" FROM "eleicoes" e WHERE m."eleicaoId" = e."id";
UPDATE "chapas" c SET "tenantId" = e."tenantId" FROM "eleicoes" e WHERE c."eleicaoId" = e."id";
UPDATE "elegiveis" eg SET "tenantId" = e."tenantId" FROM "eleicoes" e WHERE eg."eleicaoId" = e."id";
UPDATE "comparecimentos" cp SET "tenantId" = e."tenantId" FROM "eleicoes" e WHERE cp."eleicaoId" = e."id";
UPDATE "votos" v SET "tenantId" = e."tenantId" FROM "eleicoes" e WHERE v."eleicaoId" = e."id";
UPDATE "resultados_apuracao" r SET "tenantId" = e."tenantId" FROM "eleicoes" e WHERE r."eleicaoId" = e."id";

UPDATE "candidatos" ca SET "tenantId" = c."tenantId" FROM "chapas" c WHERE ca."chapaId" = c."id";
UPDATE "contestacoes_chapa" ct SET "tenantId" = c."tenantId" FROM "chapas" c WHERE ct."chapaId" = c."id";

UPDATE "fotos_imovel" f SET "tenantId" = i."tenantId" FROM "imoveis" i WHERE f."imovelId" = i."id";
UPDATE "periodos" p SET "tenantId" = i."tenantId" FROM "imoveis" i WHERE p."imovelId" = i."id";
UPDATE "solicitacoes_aluguel" s SET "tenantId" = i."tenantId" FROM "imoveis" i WHERE s."imovelId" = i."id";
UPDATE "mensagens" m SET "tenantId" = s."tenantId" FROM "solicitacoes_aluguel" s WHERE m."solicitacaoId" = s."id";

-- Linhas D8 órfãs (sem importação) — não devem existir; fallback seguro
UPDATE "linhas_d8" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "linhas_balancete" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "refresh_tokens" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "password_reset_tokens" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "membros_comissao_eleitoral" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "chapas" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "candidatos" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "contestacoes_chapa" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "elegiveis" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "comparecimentos" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "votos" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "resultados_apuracao" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "fotos_imovel" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "periodos" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "solicitacoes_aluguel" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;
UPDATE "mensagens" SET "tenantId" = 'tenant_sindprf_ce' WHERE "tenantId" IS NULL;

-- 4) NOT NULL
ALTER TABLE "users" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "refresh_tokens" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "password_reset_tokens" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "afiliados" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "importacoes_d8" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "linhas_d8" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "noticias" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "push_subscriptions" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "instagram_posts" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "convenios" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "eleicoes" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "membros_comissao_eleitoral" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "chapas" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "contestacoes_chapa" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "candidatos" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "elegiveis" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "comparecimentos" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "votos" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "resultados_apuracao" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "imoveis" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "fotos_imovel" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "periodos" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "solicitacoes_aluguel" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "mensagens" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "importacoes_balancete" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "linhas_balancete" ALTER COLUMN "tenantId" SET NOT NULL;

-- 5) Dropar uniques globais que viram compostos
DROP INDEX IF EXISTS "users_email_key";
DROP INDEX IF EXISTS "afiliados_cpf_key";
DROP INDEX IF EXISTS "afiliados_matricula_key";
DROP INDEX IF EXISTS "noticias_slug_key";
DROP INDEX IF EXISTS "push_subscriptions_endpoint_key";
DROP INDEX IF EXISTS "instagram_posts_externalId_key";
DROP INDEX IF EXISTS "importacoes_d8_competenciaAno_competenciaMes_tipo_key";
DROP INDEX IF EXISTS "importacoes_balancete_competenciaAno_competenciaMes_key";

-- 6) Novos uniques / indexes
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

CREATE UNIQUE INDEX "afiliados_tenantId_cpf_key" ON "afiliados"("tenantId", "cpf");
CREATE UNIQUE INDEX "afiliados_tenantId_matricula_key" ON "afiliados"("tenantId", "matricula");
CREATE INDEX "afiliados_tenantId_idx" ON "afiliados"("tenantId");

CREATE UNIQUE INDEX "noticias_tenantId_slug_key" ON "noticias"("tenantId", "slug");
CREATE INDEX "noticias_tenantId_status_publicadoEm_idx" ON "noticias"("tenantId", "status", "publicadoEm");
DROP INDEX IF EXISTS "noticias_status_publicadoEm_idx";

CREATE UNIQUE INDEX "push_subscriptions_tenantId_endpoint_key" ON "push_subscriptions"("tenantId", "endpoint");
CREATE INDEX "push_subscriptions_tenantId_idx" ON "push_subscriptions"("tenantId");

CREATE UNIQUE INDEX "instagram_posts_tenantId_externalId_key" ON "instagram_posts"("tenantId", "externalId");
CREATE INDEX "instagram_posts_tenantId_publicadoEm_idx" ON "instagram_posts"("tenantId", "publicadoEm");
DROP INDEX IF EXISTS "instagram_posts_publicadoEm_idx";

CREATE UNIQUE INDEX "importacoes_d8_tenantId_competenciaAno_competenciaMes_tipo_key"
  ON "importacoes_d8"("tenantId", "competenciaAno", "competenciaMes", "tipo");
CREATE INDEX "importacoes_d8_tenantId_competenciaAno_competenciaMes_idx"
  ON "importacoes_d8"("tenantId", "competenciaAno", "competenciaMes");
DROP INDEX IF EXISTS "importacoes_d8_competenciaAno_competenciaMes_idx";

CREATE UNIQUE INDEX "importacoes_balancete_tenantId_competenciaAno_competenciaMes_key"
  ON "importacoes_balancete"("tenantId", "competenciaAno", "competenciaMes");
CREATE INDEX "importacoes_balancete_tenantId_competenciaAno_competenciaMes_idx"
  ON "importacoes_balancete"("tenantId", "competenciaAno", "competenciaMes");
DROP INDEX IF EXISTS "importacoes_balancete_competenciaAno_competenciaMes_idx";

CREATE INDEX "refresh_tokens_tenantId_idx" ON "refresh_tokens"("tenantId");
CREATE INDEX "password_reset_tokens_tenantId_idx" ON "password_reset_tokens"("tenantId");
CREATE INDEX "linhas_d8_tenantId_cpf_idx" ON "linhas_d8"("tenantId", "cpf");
CREATE INDEX "linhas_d8_tenantId_matricula_idx" ON "linhas_d8"("tenantId", "matricula");
DROP INDEX IF EXISTS "linhas_d8_cpf_idx";
DROP INDEX IF EXISTS "linhas_d8_matricula_idx";

CREATE INDEX "convenios_tenantId_categoria_idx" ON "convenios"("tenantId", "categoria");
DROP INDEX IF EXISTS "convenios_categoria_idx";

CREATE INDEX "eleicoes_tenantId_idx" ON "eleicoes"("tenantId");
CREATE INDEX "membros_comissao_eleitoral_tenantId_idx" ON "membros_comissao_eleitoral"("tenantId");
CREATE INDEX "chapas_tenantId_idx" ON "chapas"("tenantId");
CREATE INDEX "contestacoes_chapa_tenantId_idx" ON "contestacoes_chapa"("tenantId");
CREATE INDEX "candidatos_tenantId_idx" ON "candidatos"("tenantId");
CREATE INDEX "elegiveis_tenantId_idx" ON "elegiveis"("tenantId");
CREATE INDEX "comparecimentos_tenantId_idx" ON "comparecimentos"("tenantId");
CREATE INDEX "votos_tenantId_idx" ON "votos"("tenantId");
CREATE INDEX "resultados_apuracao_tenantId_idx" ON "resultados_apuracao"("tenantId");
CREATE INDEX "imoveis_tenantId_idx" ON "imoveis"("tenantId");
CREATE INDEX "fotos_imovel_tenantId_idx" ON "fotos_imovel"("tenantId");
CREATE INDEX "periodos_tenantId_idx" ON "periodos"("tenantId");
CREATE INDEX "solicitacoes_aluguel_tenantId_idx" ON "solicitacoes_aluguel"("tenantId");
CREATE INDEX "mensagens_tenantId_idx" ON "mensagens"("tenantId");
CREATE INDEX "linhas_balancete_tenantId_idx" ON "linhas_balancete"("tenantId");

-- 7) Foreign keys para tenants
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "afiliados" ADD CONSTRAINT "afiliados_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "importacoes_d8" ADD CONSTRAINT "importacoes_d8_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "linhas_d8" ADD CONSTRAINT "linhas_d8_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "noticias" ADD CONSTRAINT "noticias_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_posts" ADD CONSTRAINT "instagram_posts_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "convenios" ADD CONSTRAINT "convenios_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "eleicoes" ADD CONSTRAINT "eleicoes_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membros_comissao_eleitoral" ADD CONSTRAINT "membros_comissao_eleitoral_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chapas" ADD CONSTRAINT "chapas_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contestacoes_chapa" ADD CONSTRAINT "contestacoes_chapa_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "candidatos" ADD CONSTRAINT "candidatos_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "elegiveis" ADD CONSTRAINT "elegiveis_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comparecimentos" ADD CONSTRAINT "comparecimentos_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "votos" ADD CONSTRAINT "votos_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resultados_apuracao" ADD CONSTRAINT "resultados_apuracao_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "imoveis" ADD CONSTRAINT "imoveis_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fotos_imovel" ADD CONSTRAINT "fotos_imovel_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "periodos" ADD CONSTRAINT "periodos_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "solicitacoes_aluguel" ADD CONSTRAINT "solicitacoes_aluguel_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "importacoes_balancete" ADD CONSTRAINT "importacoes_balancete_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "linhas_balancete" ADD CONSTRAINT "linhas_balancete_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
