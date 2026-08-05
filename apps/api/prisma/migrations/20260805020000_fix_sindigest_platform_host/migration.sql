-- Fase B: garantir tenant plataforma e reatribuir hosts sindigest.*
-- (corrige SQL legado que ligava sindigest → tenant_sindprf_ce)

INSERT INTO "tenants" (
  "id",
  "slug",
  "nome",
  "tipo",
  "timezone",
  "ativo",
  "branding",
  "createdAt",
  "updatedAt"
)
VALUES (
  'tenant_plataforma',
  'sindigest',
  'SindiGest (plataforma)',
  'PLATAFORMA',
  'America/Fortaleza',
  true,
  '{"nome":"SindiGest","nomeCompleto":"SindiGest — plataforma Stellar para sindicatos","logoUrl":"/logo-sindicato.png","sede":{"endereco":"Stellar Soluções","cep":"—"},"contato":{"telefones":[],"email":"contato@stellarsolucoes.com.br"},"themeColor":"#0b3d6b"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO UPDATE SET
  "tipo" = 'PLATAFORMA',
  "nome" = EXCLUDED."nome",
  "ativo" = true,
  "branding" = EXCLUDED."branding",
  "updatedAt" = NOW();

INSERT INTO "tenant_domains" ("id", "tenantId", "host", "primario", "createdAt")
SELECT
  'td_sindigest_stellar',
  t."id",
  'sindigest.stellarsolucoes.com.br',
  true,
  NOW()
FROM "tenants" AS t
WHERE t."slug" = 'sindigest'
ON CONFLICT ("host") DO UPDATE SET
  "tenantId" = EXCLUDED."tenantId",
  "primario" = true;

UPDATE "tenant_domains" AS d
SET "tenantId" = t."id",
    "primario" = true
FROM "tenants" AS t
WHERE t."slug" = 'sindigest'
  AND d."host" LIKE 'sindigest.%'
  AND d."host" <> 'sindigest.stellarsolucoes.com.br';