# Sindicato PRF — Monorepo

Monorepo com npm workspaces:

- `apps/web` — React + TypeScript + Vite (porta 5173)
- `apps/api` — NestJS (porta 3000)
- `packages/types` — schemas Zod e tipos compartilhados (`@sindprf/types`)
- `packages/config` — configs base de ESLint, Prettier e tsconfig (`@sindprf/config`)

## Requisitos

- Node 20+
- Docker (para o Postgres)

## Como rodar

```bash
npm install                # instala tudo (workspaces)
docker compose up -d       # Postgres 16 em localhost:5432
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run dev                # api em :3000 e web em :5173
```

## Scripts da raiz

- `npm run dev` — sobe api e web em paralelo (concurrently)
- `npm run build` — build de todos os workspaces
- `npm run lint` — lint de todos os workspaces
- `npm run test` — testes de todos os workspaces
