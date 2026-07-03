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

### Opção A — Tudo no Docker (recomendado)

Sobe Postgres, API (Nest watch) e Web (Vite) com hot reload:

```bash
npm run docker:up
# ou: docker compose up --build
```

- Web: http://localhost:5173
- API: http://localhost:3000
- Postgres: localhost:5432

Na primeira subida a API roda migrations e seed automaticamente (admin `admin@sindprf.local` / `Admin@123`)
(afiliado `fulano@teste.local` / `NovaSenha@123`).

Para parar: `npm run docker:down` ou `docker compose down`.

Variáveis opcionais na raiz (arquivo `.env` ao lado do `docker-compose.yml`):

```
JWT_SECRET=seu-segredo
INSTAGRAM_MOCK=true
SEED_ADMIN_SENHA=Admin@123
```

### Opção B — Só Postgres no Docker, apps na máquina

```bash
npm install
docker compose up -d postgres
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run dev
```

## Scripts da raiz

- `npm run dev` — sobe api e web em paralelo (concurrently)
- `npm run build` — build de todos os workspaces
- `npm run lint` — lint de todos os workspaces
- `npm run test` — testes de todos os workspaces

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

No `apps/api/.env`:

```
INSTAGRAM_USER_ID=<id da conta>
INSTAGRAM_ACCESS_TOKEN=<long-lived token>
INSTAGRAM_MOCK=false
```

A api renova o long-lived token automaticamente uma vez por semana (validade de 60 dias). A renovação vale para o processo em execução; ao renovar, o novo token é registrado no log — atualize o `.env` para persistir após reinícios.

### Sem credenciais (desenvolvimento)

Com `INSTAGRAM_MOCK=true` e sem credenciais, `GET /instagram/feed` responde um feed fictício para o front ser desenvolvido. Com mock desligado e sem credenciais, o feed responde vazio e a seção não aparece na Home.
