# Guia de Execução no Cursor — Sindicato PRF

Este guia é linear: siga de cima pra baixo. Cada bloco tem **o que fazer**, **o prompt pra colar no Cursor** (Composer/Agent, modo Agent) e **como validar** antes de seguir.

> Regra de ouro: só avance para o próximo bloco quando o "Validar" do atual passar. Faça commit a cada bloco concluído.

---

## Passo 0 — Preparar o ambiente (você faz manualmente, uma vez)

Antes de abrir o Cursor, tenha instalado:
- Node 20+ e npm (vem com o Node)
- Docker Desktop (pro Postgres local)
- Git

Depois:
```bash
mkdir sindprf && cd sindprf
git init
code .   # ou abra a pasta direto no Cursor
```

Coloque os 4 arquivos `.mdc` em `.cursor/rules/` e o `TASKS.md` em `docs/`. Com as rules no lugar, o Cursor já aplica as convenções automaticamente.

> Dica: trabalhe **um módulo por conversa** no Composer. Conversas curtas e focadas dão resultado muito melhor que uma thread gigante.

---

## FASE 0 — Fundação

### Bloco 0.1 — Monorepo

**Prompt Cursor:**
> Crie a estrutura de um monorepo usando **npm workspaces** (não pnpm nem yarn) com quatro pacotes: `apps/web` (Vite + React + TypeScript), `apps/api` (NestJS), `packages/types` (biblioteca TS com Zod) e `packages/config` (configs base de eslint/tsconfig).
> - No `package.json` da raiz, declare `"private": true` e `"workspaces": ["apps/*", "packages/*"]`.
> - Configure ESLint + Prettier compartilhados via `packages/config`, consumidos pelos dois apps.
> - Crie um `docker-compose.yml` com Postgres 16 na porta 5432, com volume nomeado para persistência.
> - Instale `concurrently` como devDependency na raiz e adicione os scripts da raiz:
>   - `"dev": "concurrently -n api,web -c blue,green \"npm run dev -w apps/api\" \"npm run dev -w apps/web\""`
>   - `"build": "npm run build --workspaces --if-present"`
>   - `"lint": "npm run lint --workspaces --if-present"`
>   - `"test": "npm run test --workspaces --if-present"`
> - Cada app tem seu próprio script `dev` (Vite no web, `nest start --watch` no api).
> - Crie `.env.example` em `apps/api` (com `DATABASE_URL` apontando pro Postgres do compose) e em `apps/web`.
> - O `packages/types` deve ser referenciado pelos apps como `@sindprf/types` (dependência de workspace `"@sindprf/types": "*"`).
> - Não instale dependências além do necessário para o scaffold rodar.

**Depois rode:**
```bash
npm install
docker compose up -d          # sobe o postgres
npm run dev                      # web em :5173, api em :3000
```

**Validar:** abrir `localhost:5173` (tela Vite) e `localhost:3000` (resposta do Nest). `npm run lint` passa.
Commit: `chore: setup monorepo`

### Bloco 0.2 — Prisma + schema base

**Prompt Cursor:**
> Em `apps/api`, adicione Prisma com Postgres. Crie `schema.prisma` com os modelos: `User` (id, email único, senhaHash, role, createdAt), enum `Role { ADMIN AFILIADO }`, `Afiliado` (id, userId 1:1, nome, cpf único, matricula única, telefone, status), enum `StatusAfiliado { PENDENTE APROVADO INATIVO }`. Configure a `DATABASE_URL` a partir do `.env`. Crie um `PrismaModule` e `PrismaService` globais no Nest. Gere a migration inicial e um script de seed que cria um usuário ADMIN (email admin@sindprf.local, senha temporária com bcrypt).

**Depois rode:**
```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed
npx prisma studio            # confere as tabelas visualmente
```

**Validar:** tabelas criadas no Studio; admin existe. Commit: `feat(api): prisma schema base + seed`

### Bloco 0.3 — Tipos compartilhados

**Prompt Cursor:**
> Em `packages/types`, crie schemas Zod para as entidades do domínio (User, Afiliado com status, enums Role e StatusAfiliado) e exporte os tipos inferidos. Configure o pacote como `@sindprf/types` e adicione-o como dependência de `apps/web` e `apps/api`. Garanta que ambos importam sem erro.

**Validar:** import de `@sindprf/types` funciona nos dois apps, `npm run build` passa. Commit: `feat(types): schemas compartilhados`

---

## FASE 1 — Autenticação

### Bloco 1.1 — Auth backend

**Prompt Cursor:**
> No `apps/api`, crie o módulo `auth` com: login por email/senha (bcrypt), JWT access token (15min) + refresh token (7d), endpoints `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`. Crie um `JwtAuthGuard` global com decorator `@Public()` para rotas abertas, e um `RolesGuard` com decorator `@Roles()`. Adicione fluxo de recuperação de senha (`POST /auth/forgot`, `POST /auth/reset`) com token de expiração curta. Valide os DTOs com Zod usando os schemas de `@sindprf/types`. Siga as regras em `.cursor/rules/backend.mdc`.

**Validar (use o REST client do Cursor ou curl):**
```bash
curl -X POST localhost:3000/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@sindprf.local","senha":"SUA_SENHA"}'
# deve retornar accessToken + refreshToken
curl localhost:3000/auth/me            # sem token → 401
```
Commit: `feat(api): autenticação JWT + roles`

### Bloco 1.2 — Cadastro/validação de afiliado

**Prompt Cursor:**
> No `apps/api`, crie o módulo `afiliados`: endpoint público `POST /afiliados/cadastro` (nome, cpf, matricula, telefone, email, senha) com validação de dígito verificador de CPF no schema Zod, criando User+Afiliado com status PENDENTE. Endpoints admin: `GET /afiliados` (lista/filtra por status), `PATCH /afiliados/:id/status` (aprovar/inativar). Regra: afiliado só acessa rotas restritas quando status = APROVADO — crie um `AfiliadoAprovadoGuard`. Siga `backend.mdc`.

**Validar:** cadastrar com CPF inválido → 400; cadastrar válido → PENDENTE; aprovar via admin → APROVADO. Commit: `feat(api): cadastro e aprovação de afiliados`

### Bloco 1.3 — Auth frontend

**Prompt Cursor:**
> No `apps/web`, configure TanStack Query e um store Zustand de auth (accessToken, refreshToken, user, com persist no localStorage). Crie um cliente HTTP (axios ou fetch wrapper) com interceptor que injeta o token e faz refresh automático em 401. Crie as telas: Login, Esqueci a Senha, Redefinir Senha. Configure roteamento com rotas protegidas por role (área admin e área afiliado separadas), redirecionando para /login quando não autenticado. Use React Hook Form + resolver Zod com os schemas de `@sindprf/types`. Siga `.cursor/rules/frontend.mdc`.

**Validar:** login pelo navegador → entra na área correta por role; reload mantém sessão; token expirado renova sozinho. Commit: `feat(web): fluxo de autenticação`

---

## FASE 2 — Site público + Notícias

### Bloco 2.1 — Layout público
**Prompt Cursor:**
> No `apps/web`, crie o site público: Home, Sobre, Contato e footer com dados do sindicato. Header responsivo com navegação mobile (menu hambúrguer). Defina design tokens (cores institucionais, tipografia) num arquivo de tema. Mobile-first. Siga `frontend.mdc`.

**Validar:** navegação responsiva funciona no mobile e desktop. Commit: `feat(web): site institucional público`

### Bloco 2.2 — Notícias backend
**Prompt Cursor:**
> No `apps/api`, crie o módulo `noticias`: modelo Prisma Noticia (id, titulo, slug único, capaUrl, conteudo, status RASCUNHO|PUBLICADO, publicadoEm, autorId). CRUD restrito a ADMIN. Endpoints públicos: `GET /noticias` (paginado, só PUBLICADO) e `GET /noticias/:slug`. Upload de imagem de capa (storage local por enquanto, com abstração para trocar por S3 depois). Migration incluída. Siga `backend.mdc`.

**Validar:** admin cria notícia; público só vê publicadas. Commit: `feat(api): CMS de notícias`

### Bloco 2.3 — Notícias frontend
**Prompt Cursor:**
> No `apps/web`: no painel admin, tela de gestão de notícias com editor rich text (ex: TipTap) e upload de capa. No site público, listagem paginada de notícias e página de detalhe por slug com meta tags de SEO (title, description, og:image). Consuma via TanStack Query. Siga `frontend.mdc`.

**Validar:** publicar no admin aparece no site. Commit: `feat(web): notícias admin + público`

### Bloco 2.4 — Instagram
**Prompt Cursor:**
> No `apps/api`, crie módulo `instagram` que consome a Instagram Graph API (conta Business), busca os últimos posts e os cacheia em banco/memória com um job periódico. Trate expiração de token com renovação de long-lived token. Exponha `GET /instagram/feed`. No `apps/web`, exiba um grid do feed na Home com fallback caso a API falhe (não pode quebrar a página). Coloque as credenciais em `.env` e documente o setup no README.

> ⚠️ Requer conta Instagram Business ligada a uma página do Facebook + app no Meta for Developers. Sem isso, o feed não funciona. Deixe stub/mock enquanto não tiver as credenciais.

**Validar:** feed aparece; derrubar a API não quebra a home. Commit: `feat: integração instagram`

---

## FASE 3 — Convênios

### Bloco 3.1 — Convênios backend
**Prompt Cursor:**
> No `apps/api`, módulo `convenios`: modelo Convenio (id, nome, categoria, descricao, logoUrl, link, contato, vigenciaInicio, vigenciaFim). CRUD ADMIN, leitura para AFILIADO aprovado, com filtro por categoria. Migration incluída. Siga `backend.mdc`.

**Validar:** admin gerencia, afiliado só lê. Commit: `feat(api): convênios`

### Bloco 3.2 — Convênios frontend
**Prompt Cursor:**
> No `apps/web`, área do afiliado: listagem de convênios com busca e filtro por categoria, e card de detalhe. Consuma via TanStack Query. Siga `frontend.mdc`.

**Validar:** afiliado filtra e vê detalhes. Commit: `feat(web): convênios`

---

## FASE 4 — Eleição / Votação (CRÍTICO — detalhado)

> Antes de começar: anexe manualmente a rule `.cursor/rules/eleicao.mdc` na conversa do Composer (arraste o arquivo ou use @). Ela contém as regras invioláveis de sigilo e voto único.
> ⚠️ Antes de codar, confirme com o sindicato as exigências do **estatuto** (quórum, sigilo, auditoria externa). O estatuto vence a conveniência técnica.

### Bloco 4.1 — Modelagem da eleição

**O que faz:** cria o modelo de dados separando comparecimento de voto (base do sigilo).

**Prompt Cursor:**
> Anexei a rule eleicao.mdc — siga-a como requisito de segurança. No `apps/api`, crie o módulo `eleicao` com estes modelos Prisma:
> - `Eleicao` (id, titulo, descricao, inicio, fim, status) + enum `StatusEleicao { AGENDADA ABERTA ENCERRADA APURADA }`
> - `Chapa` (id, eleicaoId, numero, nome, slogan)
> - `Candidato` (id, chapaId, nome, cargo, fotoUrl)
> - `Elegivel` (id, eleicaoId, afiliadoId) — lista de quem pode votar; unique (eleicaoId, afiliadoId)
> - `Comparecimento` (id, eleicaoId, afiliadoId, votouEm) — registra QUE o afiliado votou; unique (eleicaoId, afiliadoId). NÃO guarda em qual chapa.
> - `Voto` (id, eleicaoId, chapaId, criadoEm) — registra O voto SEM referência ao afiliado. Tabela separada de Comparecimento por design.
> Gere a migration. Não crie nenhuma relação que ligue Voto a Afiliado ou a Comparecimento.

**Validar:** no Prisma Studio, confirme que `Voto` não tem FK para afiliado/comparecimento. Commit: `feat(api): modelagem da eleição`

### Bloco 4.2 — Motor de votação (o coração)

**O que faz:** grava voto e comparecimento numa transação atômica, garantindo voto único e sigilo.

**Prompt Cursor:**
> Seguindo eleicao.mdc, implemente no módulo `eleicao` o endpoint `POST /eleicao/:id/votar` (afiliado aprovado). Regras obrigatórias:
> 1. Só permite se a eleição está ABERTA e a hora do SERVIDOR está dentro de [inicio, fim].
> 2. Só permite se o afiliado está na tabela `Elegivel` daquela eleição.
> 3. Numa ÚNICA transação Prisma: inserir `Comparecimento` (afiliadoId+eleicaoId) e inserir `Voto` (chapaId). Se a constraint unique de comparecimento falhar (já votou), aborta a transação inteira e retorna 409.
> 4. Retorna um protocolo (hash aleatório, ex: uuid + timestamp) ao eleitor, SEM revelar a escolha.
> 5. Em nenhum momento associe o registro de Voto ao afiliado.
> Adicione teste automatizado simulando dois votos concorrentes do mesmo afiliado — apenas um pode ser gravado.

**Validar:**
```bash
cd apps/api && npm test   # o teste de concorrência deve passar
```
Votar duas vezes → segundo request 409. No banco, `Voto` não permite descobrir quem votou. Commit: `feat(api): motor de votação com voto único e sigiloso`

### Bloco 4.3 — Apuração e resultados

**Prompt Cursor:**
> No módulo `eleicao`: job/endpoint que ao passar o `fim` muda status para ENCERRADA. Endpoint `POST /eleicao/:id/apurar` (ADMIN, só se ENCERRADA) que conta os votos por chapa, grava o resultado e muda status para APURADA. Endpoint `GET /eleicao/:id/resultado` que só retorna dados se status = APURADA (ou ENCERRADA conforme regra). A apuração deve ser reproduzível (rodar de novo dá o mesmo resultado). Siga eleicao.mdc.

**Validar:** resultado só aparece após encerrada/apurada; soma dos votos por chapa = total de comparecimentos. Commit: `feat(api): apuração e resultados`

### Bloco 4.4 — Painel admin da eleição

**Prompt Cursor:**
> No `apps/web`, área admin: telas para criar/editar Eleição, cadastrar Chapas e Candidatos, e montar a lista de Elegíveis (selecionar afiliados aprovados). Durante status ABERTA, mostrar APENAS o comparecimento (quantos já votaram) — NUNCA resultado parcial. Só liberar visualização de resultado quando APURADA. Siga frontend.mdc e eleicao.mdc.

**Validar:** admin não consegue ver resultado parcial com eleição aberta. Commit: `feat(web): painel admin da eleição`

### Bloco 4.5 — Tela de votação (afiliado)

**Prompt Cursor:**
> No `apps/web`, área do afiliado: tela de votação que lista as chapas com candidatos, permite selecionar uma e confirmar com DUPLA confirmação (modal "Confirmar voto na Chapa X? Esta ação é irreversível"). Após votar, exibir tela de "Você já votou" com o protocolo. Se o afiliado já votou (ou não é elegível, ou eleição fechada), bloquear a tela com a mensagem adequada. Nunca mostrar em quem ele votou depois. Siga frontend.mdc e eleicao.mdc.

**Validar:** clique acidental não vota; após votar, estado persiste no reload; protocolo é exibido. Commit: `feat(web): tela de votação do afiliado`

---

## FASE 5 — Apartamentos / Aluguel

### Bloco 5.1 — Imóveis backend
**Prompt Cursor:**
> No `apps/api`, módulo `imoveis`: modelo Imovel (id, titulo, descricao, endereco, valor, comodidades[]) + modelo Foto (id, imovelId, url). CRUD ADMIN com upload múltiplo de fotos. Leitura para afiliado aprovado. Migration incluída. Siga backend.mdc.

**Validar:** admin cria imóvel com fotos; afiliado lista. Commit: `feat(api): imóveis`

### Bloco 5.2 — Disponibilidade
**Prompt Cursor:**
> No módulo `imoveis`, adicione modelo `Periodo` (id, imovelId, inicio, fim, tipo RESERVADO|BLOQUEADO). Endpoint `GET /imoveis/:id/disponibilidade?inicio=&fim=` que retorna se o intervalo está livre. Endpoint ADMIN para bloquear/liberar datas. Trate sobreposição de intervalos corretamente. Siga backend.mdc.

**Validar:** consulta de intervalo sobreposto retorna indisponível. Commit: `feat(api): disponibilidade de imóveis`

### Bloco 5.3 — Listagem e detalhe (afiliado)
**Prompt Cursor:**
> No `apps/web`, área do afiliado: galeria de imóveis com filtro, e página de detalhe com galeria de fotos e um calendário mostrando datas disponíveis/ocupadas (consumindo o endpoint de disponibilidade). Siga frontend.mdc.

**Validar:** afiliado vê fotos e calendário de disponibilidade. Commit: `feat(web): listagem e detalhe de imóveis`

### Bloco 5.4 — Solicitação/conversa de aluguel
**Prompt Cursor:**
> No `apps/api`, adicione `SolicitacaoAluguel` (id, imovelId, afiliadoId, inicioDesejado, fimDesejado, status ABERTA|EM_ANDAMENTO|FECHADA) e `Mensagem` (id, solicitacaoId, autorId, texto, criadoEm). Afiliado abre solicitação; afiliado e admin trocam mensagens na thread. Notificar o admin de nova solicitação. No `apps/web`, tela de "minhas solicitações" (afiliado) e painel de solicitações (admin) com o chat. Use TanStack Query com polling para atualizar mensagens (realtime via WebSocket fica como evolução futura). Siga backend.mdc e frontend.mdc.

**Validar:** afiliado abre solicitação e conversa; admin responde. Commit: `feat: solicitação e chat de aluguel`

---

## FASE 6 — PWA e finalização

### Bloco 6.1 — PWA
**Prompt Cursor:**
> No `apps/web`, adicione `vite-plugin-pwa`: configure manifest (nome, ícones em vários tamanhos, cor de tema institucional), service worker com cache do app shell para funcionamento offline básico. Gere os ícones a partir do logo.

**Validar:** Lighthouse → PWA "installable" = pass. Commit: `feat(web): PWA`

### Bloco 6.2 — Botão "adicionar à tela inicial"
**Prompt Cursor:**
> No `apps/web`, implemente a captura do evento `beforeinstallprompt`, guarde-o e exiba um botão custom "Adicionar à tela inicial" (visível no mobile). Ao clicar, dispare o prompt de instalação. Para iOS/Safari (que não dispara o evento), detecte o navegador e mostre instruções manuais ("Compartilhar → Adicionar à Tela de Início"). Siga frontend.mdc.

**Validar:** Android mostra botão e instala; iOS mostra instrução. Commit: `feat(web): botão instalar PWA`

### Bloco 6.3 — Hardening e entrega
**Prompt Cursor:**
> No `apps/api`, adicione helmet, CORS restrito ao domínio do front, e rate limiting (throttler) nos endpoints de auth e votação. Escreva testes E2E dos fluxos críticos: login, cadastro+aprovação de afiliado, votação (incluindo tentativa de voto duplo), e abertura de solicitação de aluguel. Configure um pipeline de CI (GitHub Actions) que roda lint + testes + build. Documente no README como fazer deploy de produção.

**Validar:** `npm test` e CI verdes. Commit: `chore: hardening, testes e2e e CI`

---

## Comandos que você mais vai usar

```bash
npm install                      # instala tudo (workspaces resolvem sozinho)
npm run dev                      # sobe web + api juntos (concurrently)
docker compose up -d             # postgres

# Prisma — sempre a partir de apps/api:
cd apps/api && npx prisma migrate dev --name <nome>   # nova migration
cd apps/api && npx prisma studio                      # ver o banco
cd apps/api && npx prisma generate                    # regenerar o client

cd apps/api && npm test          # testes do back
npm run lint                     # lint geral (todos os workspaces)
npm run build                    # build de todos os workspaces
```

> **npm workspaces — atalhos úteis:**
> - Rodar um script num app específico da raiz: `npm run dev -w apps/api`
> - Instalar um pacote só na api: `npm install <pkg> -w apps/api`
> - Instalar na raiz (ferramentas do monorepo, ex: concurrently): `npm install -D <pkg> -w .`
> - O `packages/types` é linkado automaticamente pelos apps via `"@sindprf/types": "*"`; após alterar os tipos, rode `npm run build -w packages/types` se ele tiver etapa de build.


## Dicas de uso do Cursor

- Uma conversa por bloco. Ao terminar, comece nova conversa pro próximo.
- Se o Cursor divergir da stack, referencie a rule: "siga `.cursor/rules/backend.mdc`".
- Peça sempre pra ele **rodar/verificar** ao final: "rode o lint e corrija os erros".
- Na Fase 4, sempre anexe `eleicao.mdc` na conversa — é a parte mais fácil de errar.
- Commit a cada bloco. Se algo quebrar, você volta fácil.