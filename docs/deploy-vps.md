# Deploy VPS — SindiGest / SINDPRF

Banco: **Supabase** (inalterado).  
VPS: Docker (web + api) + **Nginx Proxy Manager** (já em uso).

Referência visual do que já ocupa a VPS (`187.127.42.128`):

| Host NPM | Destino | Porta host |
|----------|---------|------------|
| `baturite.stellarsolucoes.com.br` | frontend gestao | **8080** |
| `apibaturite.stellarsolucoes.com.br` | api gestao | **3000** |
| Jitsi / meet | … | 443, 8000, 8444, 10000 |

**Portas livres escolhidas para sindicatos (não colidem):**

| Serviço | Porta no host |
|---------|----------------|
| Web (nginx do front) | **8081** |
| API (Nest) | **3002** |

---

## Hosts deste produto

| Host | Papel | Tenant | Aponta para |
|------|--------|--------|-------------|
| `sindprf.stellarsolucoes.com.br` | Site do cliente SINDPRF-CE | `sindprf-ce` (`SINDICATO`) | web `:8081` |
| `sindigest.stellarsolucoes.com.br` | Painel Stellar (SUPERADMIN) | `sindigest` (`PLATAFORMA`) | web `:8081` |
| `apisindigest.stellarsolucoes.com.br` | API compartilhada | — | api `:3002` |

O **mesmo** container web serve os dois hosts. O tenant é resolvido pelo hostname (`X-Tenant-Host` / Host).  
`tipo === PLATAFORMA` → router do painel; `SINDICATO` → site público + áreas do sindicato.

> **Não** cadastre `sindigest…` no tenant do sindicato. Use `PLATFORM_SEED_HOSTS` / seed Fase B.

---

## 1. DNS

No DNS de `stellarsolucoes.com.br` (A ou CNAME → IP da VPS `187.127.42.128`):

- `sindprf`
- `sindigest`
- `apisindigest`

---

## 2. `.env` na raiz do projeto (VPS)

> **O `.env` não é versionado.** Ele vive só na VPS. Se aparecer no `git status`,
> algo está errado — veja a seção "Segredos" abaixo.

```env
# Supabase.
#
# NÃO use `?pgbouncer=true` na porta 5432. A 5432 é o pooler em modo SESSION,
# que suporta prepared statements; a flag desliga esse recurso e faz cada
# consulta custar ~5x mais (medido: 722ms com a flag, 146ms sem). A flag só é
# necessária na porta 6543 (modo TRANSACTION).
#
# Prefira a região sa-east-1 (São Paulo): cada consulta é um round-trip, e um
# banco em us-west-2 custa ~140ms contra ~15ms em São Paulo.
#
# Para medir o seu: node scripts/medir-latencia-banco.mjs
DATABASE_URL=...pooler...:5432/postgres
DIRECT_URL=...   # mesma string, usada nas migrations

WEB_PORT=8081
API_PORT=3002

WEB_URL=https://sindprf.stellarsolucoes.com.br
VITE_API_URL=https://apisindigest.stellarsolucoes.com.br

# Hosts do front (sem https://) — separados!
TENANT_SEED_HOSTS=sindprf.stellarsolucoes.com.br
PLATFORM_SEED_HOSTS=sindigest.stellarsolucoes.com.br

CORS_ORIGINS=https://sindigest.stellarsolucoes.com.br,https://sindprf.stellarsolucoes.com.br

JWT_SECRET=<openssl rand -hex 32>
SEED_ON_START=false
SEED_ADMIN_SENHA=<senha>
SEED_SUPERADMIN_EMAIL=superadmin@sindigest.local
```

Alinhe com `.env.example` da raiz. Se `TENANT_SEED_HOSTS` ainda tiver `sindigest…`, remova — o seed ignora, mas o env antigo confunde.

---

## 3. Subir na VPS

```bash
cd /opt/SistemaSindicatos   # ou caminho do repo

# O .env deixou de ser versionado. Se ele ainda estiver rastreado nesta cópia,
# o pull tentará removê-lo — guarde uma cópia antes de qualquer coisa.
cp .env ~/env-backup-$(date +%F)

git pull
cp ~/env-backup-$(date +%F) .env   # só se o pull tiver removido/alterado

# confira .env (PLATFORM_SEED_HOSTS e TENANT_SEED_HOSTS separados,
# DATABASE_URL sem `?pgbouncer=true`)

docker compose up --build -d
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

### Só mudou o `.env` (sem mudança de código)

Não precisa rebuildar; basta recriar o container da API para reler as variáveis:

```bash
docker compose up -d --force-recreate api
docker compose logs -f api
```

Validar mapeamento no Supabase (SQL Editor):

```sql
SELECT d.host, t.slug, t.tipo
FROM tenant_domains d
JOIN tenants t ON t.id = d."tenantId"
WHERE d.host LIKE '%sindigest%' OR d.host LIKE '%sindprf%'
ORDER BY d.host;
```

Esperado:

| host | slug | tipo |
|------|------|------|
| `sindigest.stellarsolucoes.com.br` | `sindigest` | `PLATAFORMA` |
| `sindprf.stellarsolucoes.com.br` | `sindprf-ce` | `SINDICATO` |

Correção manual (se ainda estiver errado):

```sql
UPDATE tenant_domains
SET "tenantId" = (SELECT id FROM tenants WHERE slug = 'sindigest'),
    primario = true
WHERE host = 'sindigest.stellarsolucoes.com.br';
```

Depois reinicie a API (cache de host ~60s): `docker compose restart api`.

---

## 4. Nginx Proxy Manager — 3 Proxy Hosts

Mesmo padrão do Baturité (`http://187.127.42.128:PORTA`).

### A) Front SINDPRF

| Campo | Valor |
|-------|--------|
| Domain Names | `sindprf.stellarsolucoes.com.br` |
| Scheme | `http` |
| Forward Hostname / IP | `187.127.42.128` |
| Forward Port | `8081` |
| SSL | Let’s Encrypt + Force SSL |

### B) Front SindiGest (plataforma)

| Campo | Valor |
|-------|--------|
| Domain Names | `sindigest.stellarsolucoes.com.br` |
| Scheme | `http` |
| Forward Hostname / IP | `187.127.42.128` |
| Forward Port | `8081` |
| SSL | Let’s Encrypt + Force SSL |

### C) API

| Campo | Valor |
|-------|--------|
| Domain Names | `apisindigest.stellarsolucoes.com.br` |
| Scheme | `http` |
| Forward Hostname / IP | `187.127.42.128` |
| Forward Port | `3002` (precisa ser igual ao `API_PORT` do `.env`) |
| SSL | Let’s Encrypt + Force SSL |

> Se a porta do NPM ≠ `API_PORT`, o browser mostra “CORS” / `ERR_FAILED` (na verdade é 502 sem header CORS).

**Advanced** (API), se o NPM não repassar headers:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Tenant-Host $http_x_tenant_host;
```

---

## 5. Validar

1. `https://apisindigest.stellarsolucoes.com.br/` → `{"status":"ok",...}`
2. `https://sindprf.stellarsolucoes.com.br/` → site do sindicato
3. `https://sindigest.stellarsolucoes.com.br/` → **login / painel plataforma** (não o site do PRF)
4. Network: `GET …/tenants/current` com `X-Tenant-Host: sindigest…` → `"tipo":"PLATAFORMA"`
5. Login plataforma: `superadmin@sindigest.local` + `SEED_ADMIN_SENHA`
6. Login sindicato: `admin@sindprf.local`

### Formulário de contato (e-mail gratuito)

No `.env` da VPS, defina o destino e um provedor:

```env
CONTATO_DESTINO_EMAIL=seu-email@outlook.com
RESEND_API_KEY=re_xxxxxxxx   # https://resend.com — plano free
RESEND_FROM=SINDPRF-CE <onboarding@resend.dev>
```

Com `onboarding@resend.dev`, o Resend só entrega no e-mail da conta. Depois de verificar domínio próprio, pode mudar `RESEND_FROM`.

Alternativa SMTP (Outlook/Gmail) — veja `.env.example`. Reinicie a API após alterar:

```bash
docker compose up -d --force-recreate api
```

---

## 6. Depois: domínio próprio do cliente

1. DNS do cliente → `187.127.42.128`
2. NPM: novo Proxy Host → `187.127.42.128:8081`
3. `INSERT` em `tenant_domains` **do tenant do sindicato** (não da plataforma)
4. API continua em `apisindigest...` (o front manda `X-Tenant-Host`)

---

## Segredos

O `.env` **não** entra no Git (regra em `.gitignore`). Ele é criado a partir do
`.env.example` diretamente na VPS.

Se algum `.env` já foi versionado, adicionar a regra ao `.gitignore` não basta —
o arquivo continua rastreado e o conteúdo permanece no histórico. É preciso:

```bash
git rm --cached .env apps/api/.env apps/web/.env
git commit -m "chore: remove .env do versionamento"
```

E, principalmente, **rotacionar tudo que foi exposto**: senha do banco no
Supabase, `JWT_SECRET` (invalida as sessões ativas), chaves VAPID e
`SEED_ADMIN_SENHA`. Reescrever o histórico não substitui a rotação: qualquer
clone ou fork feito antes ainda carrega os valores antigos.

---

## Diagnosticar lentidão

A API mede cada requisição e registra as que passam do limite, separando tempo
de banco de tempo de aplicação:

```
WARN [Perf] PATCH /eleicoes/x/chapas/y/homologar 480ms
            (banco 470ms em 2 consultas, app 10ms) mais lenta: Chapa.update 240ms
```

O limite padrão é 700ms; ajuste com `PERF_LOG_MS` no `.env` (em ms) e recrie a
API. Se o tempo estiver quase todo em "banco" com poucas consultas, o problema é
latência de rede até o Supabase — confira região e a flag `pgbouncer`
(seção 2) com `node scripts/medir-latencia-banco.mjs`.

---

## Comandos úteis

```bash
docker compose logs -f api
docker compose up -d api                    # mudou WEB_URL / env
docker compose up --build -d                # código + front
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
docker compose down
```
