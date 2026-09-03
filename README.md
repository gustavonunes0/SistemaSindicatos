# Sindicato PRF — Monorepo

Monorepo com npm workspaces:

- `apps/web` — React + TypeScript + Vite (porta 5173)
- `apps/api` — NestJS (porta 3000)
- `packages/types` — schemas Zod e tipos compartilhados (`@sindprf/types`)
- `packages/config` — configs base de ESLint, Prettier e tsconfig (`@sindprf/config`)

## Requisitos

- Node 20+ (para rodar fora do Docker)
- Docker Desktop (para subir banco + api + web juntos)

## Como rodar

### Opção A — Desenvolvimento no Docker (hot reload)

```bash
npm run docker:up
# ou: docker compose -f docker-compose.dev.yml up --build
```

- Web: http://localhost:5173
- API: http://localhost:3000
- Postgres: localhost:5432

Na primeira subida a API roda migrations e seed automaticamente (admin `admin@sindprf.local` / `Admin@123`).

Para parar: `npm run docker:down`.

### Opção B — Só Postgres no Docker, apps na máquina

```bash
npm install
docker compose -f docker-compose.dev.yml up -d postgres
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run dev
```

## Deploy na Vercel (frontend)

O **web** (Vite/React) vai bem na Vercel. A **API NestJS** usa disco local para uploads e `@nestjs/schedule` (cron) — isso não funciona bem em serverless. Mantenha a API + Postgres em VPS/Railway/Render/Fly.

### Projeto 1 — Frontend

1. Importar o repositório na Vercel.
2. **Root Directory:** `apps/web` (obrigatório no monorepo).
3. A Vercel lê `apps/web/vercel.json` (instala na raiz e roda `npm run build:web`, que compila `@sindprf/types` antes).
4. Variável de ambiente:
   - `VITE_API_URL` = URL pública da API (ex.: `https://api.seudominio.com`)

### Projeto 2 — API (opcional / não recomendado na Vercel)

Se mesmo assim quiser tentar a API na Vercel:

1. **Root Directory:** `apps/api`
2. Variáveis: `DATABASE_URL`, `JWT_SECRET`, `WEB_URL` (URL do front na Vercel), `PORT`
3. Rode migrations fora do deploy: `npx prisma migrate deploy`
4. Uploads em disco **não persistem**; Instagram cron pode falhar no modelo serverless.

O erro `Cannot find module '@sindprf/types'` acontece quando o Nest builda sem compilar o pacote compartilhado antes. Use sempre `npm run build:api` / `build:web` (ou o `vercel.json` acima).

## Deploy na VPS — Docker + Supabase + Nginx Proxy Manager

Guia completo: **[`docs/deploy-vps.md`](docs/deploy-vps.md)**.

Hosts Stellar (portas **8081** / **3002** — fora do Baturité em 8080/3000):

| Host | Destino |
|------|---------|
| `sindprf.stellarsolucoes.com.br` | web `:8081` |
| `sindigest.stellarsolucoes.com.br` | web `:8081` |
| `apisindigest.stellarsolucoes.com.br` | api `:3002` |

```bash
cp .env.example .env   # Supabase + URLs acima
docker compose up --build -d
```

### Postgres local (opcional)

Só se **não** for usar Supabase:

```bash
# no .env: DATABASE_URL=postgresql://sindprf:SENHA@postgres:5432/sindprf?schema=public
docker compose --profile local-db up --build -d
```


## Scripts da raiz

- `npm run dev` — sobe api e web em paralelo (concurrently)
- `npm run docker:up` / `docker:down` — ambiente de desenvolvimento
- `npm run docker:prod` / `docker:prod:down` — produção (VPS)
- `npm run build` — build de todos os workspaces
- `npm run lint` — lint de todos os workspaces
- `npm run test` — testes de todos os workspaces

## PWA (Progressive Web App)

O frontend é instalável como app no celular (Android/Chrome e iOS/Safari).

- **Build de produção** gera manifest + service worker (`vite-plugin-pwa`) com cache do app shell para uso offline básico.
- **Ícones** em `apps/web/public/icons/` — regenere após trocar o logo: `npm run generate-icons -w apps/web`
- **Instalação no Android:** barra fixa no rodapé (mobile) com “Adicionar à tela inicial”.
- **iOS/Safari:** mesma barra abre instruções (Compartilhar → Adicionar à Tela de Início).

Valide com Lighthouse (categoria PWA → Installable) em build de produção:

```bash
npm run build -w apps/web
npm run preview -w apps/web
```

## Deploy de produção (sem Docker)

### 1. Banco de dados

Provisione PostgreSQL 16+ e defina `DATABASE_URL` na API.

```bash
cd apps/api
npx prisma migrate deploy
npx prisma db seed   # apenas na primeira subida
```

### 2. API (NestJS)

Variáveis obrigatórias (`apps/api/.env`):

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string Postgres |
| `JWT_SECRET` | Segredo forte (`openssl rand -hex 32`) |
| `WEB_URL` | URL pública do frontend (CORS) |
| `PORT` | Porta HTTP (padrão 3000) |

```bash
npm run build -w packages/types
npm run build -w apps/api
npm run start -w apps/api
```

A API expõe uploads estáticos em `/uploads/`. Em produção, prefira object storage (S3) — a abstração atual usa disco local.

### 3. Frontend (Vite)

Defina `VITE_API_URL` apontando para a API pública antes do build:

```bash
# apps/web/.env.production
VITE_API_URL=https://api.seudominio.gov.br
```

```bash
npm run build -w apps/web
```

Sirva o conteúdo de `apps/web/dist` via CDN ou nginx. Configure fallback SPA:

```
try_files $uri $uri/ /index.html;
```

### 4. Segurança

A API usa **Helmet**, **CORS** restrito a `WEB_URL` e **rate limiting** nos endpoints de auth e cadastro de afiliado.

### 5. CI

O workflow `.github/workflows/ci.yml` roda lint, testes E2E (Postgres) e build a cada push/PR.

## Integração com Instagram

A Home exibe o feed do Instagram do sindicato via [Instagram Graph API](https://developers.facebook.com/docs/instagram-platform). A api sincroniza os posts a cada hora e os cacheia no banco (tabela `instagram_posts`); se a API do Meta cair, o site continua servindo o cache.

### Pré-requisitos

1. Conta **Instagram Business** (ou Creator) vinculada a uma **Página do Facebook**.
2. App criado no [Meta for Developers](https://developers.facebook.com/) com o produto **Instagram Graph API** habilitado.

### Obtendo as credenciais

Há dois caminhos. O do Facebook (página ligada ao Instagram) é o que o sindicato usa hoje.

**Página do Facebook (Graph API Explorer)**

1. [Graph API Explorer](https://developers.facebook.com/tools/explorer/) → app do sindicato.
2. Permissões: `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish` (opcional).
3. `GET /me/accounts` → copie o `access_token` da página **SINDPRF/CE** (não o token do usuário).
4. `GET /{page-id}?fields=instagram_business_account` → o `id` retornado é o `INSTAGRAM_USER_ID` (não use o ID da página).
5. Troque o token da página por um de longa duração:
   `GET https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&fb_exchange_token=<TOKEN_DA_PAGINA>`

**Instagram Login** (alternativa)

1. Token curto no painel do app.
2. Long-lived: `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=<APP_SECRET>&access_token=<TOKEN_CURTO>`
3. User id: `GET https://graph.instagram.com/me?fields=id,username&access_token=<TOKEN>`

### Configuração

No `apps/api/.env` (ou no `.env` da raiz no Docker):

```
INSTAGRAM_USER_ID=<id da conta>
INSTAGRAM_ACCESS_TOKEN=<long-lived token>
INSTAGRAM_MOCK=false
```

A api renova o long-lived token automaticamente uma vez por semana (validade de 60 dias). A renovação vale para o processo em execução; ao renovar, o novo token é registrado no log — atualize o `.env` para persistir após reinícios.

### Sem credenciais (desenvolvimento)

Com `INSTAGRAM_MOCK=true` e sem credenciais, `GET /instagram/feed` responde um feed fictício para o front ser desenvolvido. Com mock desligado e sem credenciais, o feed responde vazio e a seção não aparece na Home.
