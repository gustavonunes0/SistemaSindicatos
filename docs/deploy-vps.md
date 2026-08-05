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
| API (Nest) | **3001** |

---

## Hosts deste produto

| Host | Papel | Tenant | Aponta para |
|------|--------|--------|-------------|
| `sindprf.stellarsolucoes.com.br` | Site do cliente SINDPRF-CE | `sindprf-ce` (`SINDICATO`) | web `:8081` |
| `sindigest.stellarsolucoes.com.br` | Painel Stellar (SUPERADMIN) | `sindigest` (`PLATAFORMA`) | web `:8081` |
| `apisindigest.stellarsolucoes.com.br` | API compartilhada | — | api `:3001` |

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

```env
# Supabase (as mesmas strings que já funcionam)
DATABASE_URL=...pooler...?pgbouncer=true
DIRECT_URL=...   # sem pgbouncer, para migrations

WEB_PORT=8081
API_PORT=3001

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
git pull
# confira .env (PLATFORM_SEED_HOSTS, TENANT_SEED_HOSTS separados)

docker compose up --build -d
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
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
| Forward Port | `3001` |
| SSL | Let’s Encrypt + Force SSL |

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

---

## 6. Depois: domínio próprio do cliente

1. DNS do cliente → `187.127.42.128`
2. NPM: novo Proxy Host → `187.127.42.128:8081`
3. `INSERT` em `tenant_domains` **do tenant do sindicato** (não da plataforma)
4. API continua em `apisindigest...` (o front manda `X-Tenant-Host`)

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
