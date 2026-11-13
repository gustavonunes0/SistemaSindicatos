-- Declaração de filiação avulsa (sem convênio).
ALTER TABLE "declaracoes_emitidas" ALTER COLUMN "convenioId" DROP NOT NULL;
