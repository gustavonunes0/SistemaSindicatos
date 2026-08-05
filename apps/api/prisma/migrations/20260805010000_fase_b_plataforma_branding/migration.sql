-- Fase B: SUPERADMIN + TenantTipo + branding seed preparado via seed.ts

CREATE TYPE "TenantTipo" AS ENUM ('SINDICATO', 'PLATAFORMA');

ALTER TABLE "tenants" ADD COLUMN "tipo" "TenantTipo" NOT NULL DEFAULT 'SINDICATO';

ALTER TYPE "Role" ADD VALUE 'SUPERADMIN';
