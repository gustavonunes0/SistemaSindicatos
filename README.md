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

## Deploy na VPS (Hostinger)

Sobe **Postgres + API + Frontend (nginx)** com o `docker-compose.yml` de produção.

### 1. Na VPS

```bash
# Docker + Compose (Ubuntu/Debian)
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER   # saia e entre de novo na sessão

git clone <seu-repositorio> sindprf
cd sindprf
cp .env.example .env
nano .env   # preencha as variáveis abaixo
```

### 2. Variáveis obrigatórias (`.env` na raiz)

| Variável | Exemplo | Notas |
|----------|---------|--------|
| `POSTGRES_PASSWORD` | senha forte | Banco só na rede interna do Docker |
| `JWT_SECRET` | `openssl rand -hex 32` | Segredo dos tokens |
| `WEB_URL` | `http://SEU_IP` ou `https://seudominio.com` | Origem do CORS (URL do front) |
| `VITE_API_URL` | `http://SEU_IP:3000` ou `https://api.seudominio.com` | URL da API no navegador |
| `SEED_ON_START` | `true` na 1ª vez | Cria admin; depois mude para `false` |
| `SEED_ADMIN_SENHA` | senha forte | Senha inicial do admin |

Portas padrão: front `80`, API `3000`. Abra-as no firewall da Hostinger (e no `ufw` se estiver ativo).

### 3. Subir

```bash
docker compose up --build -d
docker compose logs -f    # acompanhar
```

- Front: `http://SEU_IP`
- API health: `http://SEU_IP:3000/`
- Admin: `admin@sindprf.local` + a senha de `SEED_ADMIN_SENHA`

Após a primeira subida bem-sucedida, edite `.env` com `SEED_ON_START=false` (não precisa rebuild).

Se mudar `VITE_API_URL`, rebuild do front:

```bash
docker compose up --build -d web
```

### 4. Domínio + HTTPS (recomendado)

1. Aponte o DNS A do domínio (e opcionalmente `api.`) para o IP da VPS.
2. Ajuste `WEB_URL` e `VITE_API_URL` para `https://...`.
3. Use o proxy SSL da Hostinger, Cloudflare (Flexible/Full) ou Caddy/nginx na frente das portas 80/3000.

### 5. Comandos úteis

```bash
docker compose ps
docker compose logs -f api
docker compose exec api npx prisma db seed   # seed manual
docker compose down                            # para os containers (mantém volumes)
```

Uploads ficam no volume `api_uploads`; o banco no volume `sindprf_pgdata`.

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

1. No painel do app, gere um **access token de curta duração** para a conta (Graph API Explorer ou fluxo de login).
2. Troque por um **long-lived token** (60 dias):
   `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=<APP_SECRET>&access_token=<TOKEN_CURTO>`
3. Descubra o **user id** da conta:
   `GET https://graph.instagram.com/me?fields=id,username&access_token=<TOKEN>`

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
