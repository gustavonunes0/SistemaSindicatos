-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'AFILIADO');

-- CreateEnum
CREATE TYPE "StatusAfiliado" AS ENUM ('PENDENTE', 'APROVADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "StatusNoticia" AS ENUM ('RASCUNHO', 'PUBLICADO');

-- CreateEnum
CREATE TYPE "StatusEleicao" AS ENUM ('AGENDADA', 'ABERTA', 'ENCERRADA', 'APURADA');

-- CreateEnum
CREATE TYPE "TipoPeriodo" AS ENUM ('RESERVADO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'FECHADA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AFILIADO',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMPTZ NOT NULL,
    "revogado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMPTZ NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "afiliados" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "telefone" TEXT,
    "status" "StatusAfiliado" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "afiliados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noticias" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "capaUrl" TEXT,
    "conteudo" TEXT NOT NULL,
    "status" "StatusNoticia" NOT NULL DEFAULT 'RASCUNHO',
    "publicadoEm" TIMESTAMPTZ,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "noticias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_posts" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "caption" TEXT,
    "mediaType" TEXT NOT NULL,
    "publicadoEm" TIMESTAMPTZ NOT NULL,
    "sincronizado" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convenios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "logoUrl" TEXT,
    "link" TEXT,
    "contato" TEXT,
    "vigenciaInicio" TIMESTAMPTZ,
    "vigenciaFim" TIMESTAMPTZ,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "convenios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eleicoes" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fim" TIMESTAMPTZ NOT NULL,
    "status" "StatusEleicao" NOT NULL DEFAULT 'AGENDADA',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "eleicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapas" (
    "id" TEXT NOT NULL,
    "eleicaoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "slogan" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidatos" (
    "id" TEXT NOT NULL,
    "chapaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "fotoUrl" TEXT,

    CONSTRAINT "candidatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elegiveis" (
    "id" TEXT NOT NULL,
    "eleicaoId" TEXT NOT NULL,
    "afiliadoId" TEXT NOT NULL,

    CONSTRAINT "elegiveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparecimentos" (
    "id" TEXT NOT NULL,
    "eleicaoId" TEXT NOT NULL,
    "afiliadoId" TEXT NOT NULL,
    "votouEm" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "protocolo" TEXT NOT NULL,

    CONSTRAINT "comparecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votos" (
    "id" TEXT NOT NULL,
    "eleicaoId" TEXT NOT NULL,
    "chapaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultados_apuracao" (
    "id" TEXT NOT NULL,
    "eleicaoId" TEXT NOT NULL,
    "chapaId" TEXT NOT NULL,
    "totalVotos" INTEGER NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "apuradoEm" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resultados_apuracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imoveis" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "comodidades" TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "imoveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos_imovel" (
    "id" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "fotos_imovel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodos" (
    "id" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fim" TIMESTAMPTZ NOT NULL,
    "tipo" "TipoPeriodo" NOT NULL,

    CONSTRAINT "periodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_aluguel" (
    "id" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "afiliadoId" TEXT NOT NULL,
    "inicioDesejado" TIMESTAMPTZ NOT NULL,
    "fimDesejado" TIMESTAMPTZ NOT NULL,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'ABERTA',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "solicitacoes_aluguel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "afiliados_userId_key" ON "afiliados"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "afiliados_cpf_key" ON "afiliados"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "afiliados_matricula_key" ON "afiliados"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "noticias_slug_key" ON "noticias"("slug");

-- CreateIndex
CREATE INDEX "noticias_status_publicadoEm_idx" ON "noticias"("status", "publicadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_posts_externalId_key" ON "instagram_posts"("externalId");

-- CreateIndex
CREATE INDEX "instagram_posts_publicadoEm_idx" ON "instagram_posts"("publicadoEm");

-- CreateIndex
CREATE INDEX "convenios_categoria_idx" ON "convenios"("categoria");

-- CreateIndex
CREATE INDEX "chapas_eleicaoId_idx" ON "chapas"("eleicaoId");

-- CreateIndex
CREATE UNIQUE INDEX "chapas_eleicaoId_numero_key" ON "chapas"("eleicaoId", "numero");

-- CreateIndex
CREATE INDEX "candidatos_chapaId_idx" ON "candidatos"("chapaId");

-- CreateIndex
CREATE INDEX "elegiveis_eleicaoId_idx" ON "elegiveis"("eleicaoId");

-- CreateIndex
CREATE UNIQUE INDEX "elegiveis_eleicaoId_afiliadoId_key" ON "elegiveis"("eleicaoId", "afiliadoId");

-- CreateIndex
CREATE UNIQUE INDEX "comparecimentos_protocolo_key" ON "comparecimentos"("protocolo");

-- CreateIndex
CREATE INDEX "comparecimentos_eleicaoId_idx" ON "comparecimentos"("eleicaoId");

-- CreateIndex
CREATE UNIQUE INDEX "comparecimentos_eleicaoId_afiliadoId_key" ON "comparecimentos"("eleicaoId", "afiliadoId");

-- CreateIndex
CREATE INDEX "votos_eleicaoId_idx" ON "votos"("eleicaoId");

-- CreateIndex
CREATE INDEX "votos_chapaId_idx" ON "votos"("chapaId");

-- CreateIndex
CREATE INDEX "resultados_apuracao_eleicaoId_idx" ON "resultados_apuracao"("eleicaoId");

-- CreateIndex
CREATE UNIQUE INDEX "resultados_apuracao_eleicaoId_chapaId_key" ON "resultados_apuracao"("eleicaoId", "chapaId");

-- CreateIndex
CREATE INDEX "fotos_imovel_imovelId_idx" ON "fotos_imovel"("imovelId");

-- CreateIndex
CREATE INDEX "periodos_imovelId_inicio_fim_idx" ON "periodos"("imovelId", "inicio", "fim");

-- CreateIndex
CREATE INDEX "solicitacoes_aluguel_imovelId_idx" ON "solicitacoes_aluguel"("imovelId");

-- CreateIndex
CREATE INDEX "solicitacoes_aluguel_afiliadoId_idx" ON "solicitacoes_aluguel"("afiliadoId");

-- CreateIndex
CREATE INDEX "mensagens_solicitacaoId_idx" ON "mensagens"("solicitacaoId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "afiliados" ADD CONSTRAINT "afiliados_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noticias" ADD CONSTRAINT "noticias_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapas" ADD CONSTRAINT "chapas_eleicaoId_fkey" FOREIGN KEY ("eleicaoId") REFERENCES "eleicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatos" ADD CONSTRAINT "candidatos_chapaId_fkey" FOREIGN KEY ("chapaId") REFERENCES "chapas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elegiveis" ADD CONSTRAINT "elegiveis_eleicaoId_fkey" FOREIGN KEY ("eleicaoId") REFERENCES "eleicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elegiveis" ADD CONSTRAINT "elegiveis_afiliadoId_fkey" FOREIGN KEY ("afiliadoId") REFERENCES "afiliados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparecimentos" ADD CONSTRAINT "comparecimentos_eleicaoId_fkey" FOREIGN KEY ("eleicaoId") REFERENCES "eleicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparecimentos" ADD CONSTRAINT "comparecimentos_afiliadoId_fkey" FOREIGN KEY ("afiliadoId") REFERENCES "afiliados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_eleicaoId_fkey" FOREIGN KEY ("eleicaoId") REFERENCES "eleicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_chapaId_fkey" FOREIGN KEY ("chapaId") REFERENCES "chapas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultados_apuracao" ADD CONSTRAINT "resultados_apuracao_eleicaoId_fkey" FOREIGN KEY ("eleicaoId") REFERENCES "eleicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultados_apuracao" ADD CONSTRAINT "resultados_apuracao_chapaId_fkey" FOREIGN KEY ("chapaId") REFERENCES "chapas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos_imovel" ADD CONSTRAINT "fotos_imovel_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos" ADD CONSTRAINT "periodos_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_aluguel" ADD CONSTRAINT "solicitacoes_aluguel_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_aluguel" ADD CONSTRAINT "solicitacoes_aluguel_afiliadoId_fkey" FOREIGN KEY ("afiliadoId") REFERENCES "afiliados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_aluguel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
