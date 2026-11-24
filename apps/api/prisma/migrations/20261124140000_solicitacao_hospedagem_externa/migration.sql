-- Pedidos de hospedagem sem conta (filiado de outro estado / não filiado).
ALTER TABLE "solicitacoes_aluguel" ALTER COLUMN "afiliadoId" DROP NOT NULL;

ALTER TABLE "solicitacoes_aluguel"
  ADD COLUMN "perfilHospedagem" TEXT NOT NULL DEFAULT 'FILIADO_SINDPRF',
  ADD COLUMN "solicitanteNome" TEXT,
  ADD COLUMN "solicitanteCpf" TEXT,
  ADD COLUMN "solicitanteEmail" TEXT,
  ADD COLUMN "solicitanteTelefone" TEXT,
  ADD COLUMN "sindicatoOrigem" TEXT,
  ADD COLUMN "acompanhantes" TEXT,
  ADD COLUMN "observacoes" TEXT;

-- FK: exclusão do afiliado não apaga o histórico do pedido.
ALTER TABLE "solicitacoes_aluguel" DROP CONSTRAINT IF EXISTS "solicitacoes_aluguel_afiliadoId_fkey";
ALTER TABLE "solicitacoes_aluguel"
  ADD CONSTRAINT "solicitacoes_aluguel_afiliadoId_fkey"
  FOREIGN KEY ("afiliadoId") REFERENCES "afiliados"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "solicitacoes_aluguel_tenantId_status_idx"
  ON "solicitacoes_aluguel"("tenantId", "status");
