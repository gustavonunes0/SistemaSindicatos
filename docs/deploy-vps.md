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

| Host | Papel | Aponta para |
|------|--------|-------------|
| `sindprf.stellarsolucoes.com.br` | Site do cliente SINDPRF-CE (tenant) | web `:8081` |
| `sindigest.stellarsolucoes.com.br` | Marca/produto SindiGest (mesmo front por enquanto) | web `:8081` |
| `apisindigest.stellarsolucoes.com.br` | API compartilhada | api `:3001` |

> Por enquanto os dois fronts usam o **mesmo** container web. O tenant é resolvido pelo hostname (`X-Tenant-Host`). Cadastre **os dois** hosts em `tenant_domains` do `sindprf-ce` até existir um tenant “plataforma” separado.

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

# CORS = origem do browser (um dos fronts; o principal do tenant)
WEB_URL=https://sindprf.stellarsolucoes.com.br

# Embutida no build do Vite — rebuild se mudar
VITE_API_URL=https://apisindigest.stellarsolucoes.com.br

# Bootstrap multi-tenant (hosts do front, sem https://)
TENANT_SEED_HOSTS=sindprf.stellarsolucoes.com.br,sindigest.stellarsolucoes.com.br

JWT_SECRET=<openssl rand -hex 32>
SEED_ON_START=false
```

`WEB_URL` precisa ser uma origem válida no CORS. O front também envia `X-Tenant-Host`; o bootstrap da API libera origins cujo host está em `tenant_domains`. Por isso cadastre **sindprf** e **sindigest** nos domains.

Se for abrir só por `sindigest` no dia a dia, pode usar:

```env
WEB_URL=https://sindigest.stellarsolucoes.com.br
```

desde que `sindigest` esteja em `tenant_domains`.

---

## 3. Subir na VPS

```bash
cd /caminho/sindprf   # ou sindigest — pasta do repo
cp .env.example .env  # se ainda não tiver
# edite .env com os valores acima + Supabase

docker compose up --build -d
docker compose ps

curl -s http://127.0.0.1:3001/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8081/
```

Cadastrar hosts do tenant:

```bash
docker compose exec \
  -e TENANT_SEED_HOSTS=sindprf.stellarsolucoes.com.br,sindigest.stellarsolucoes.com.br \
  api npx prisma db seed
```

Ou no SQL Editor do Supabase:

```sql
INSERT INTO tenant_domains (id, "tenantId", host, primario, "createdAt")
VALUES
  ('td_sindprf_stellar', 'tenant_sindprf_ce', 'sindprf.stellarsolucoes.com.br', true, NOW()),
  ('td_sindigest_stellar', 'tenant_sindprf_ce', 'sindigest.stellarsolucoes.com.br', false, NOW())
ON CONFLICT (host) DO UPDATE
SET "tenantId" = EXCLUDED."tenantId";
```

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

### B) Front SindiGest

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
2. `https://sindprf.stellarsolucoes.com.br/` → site (não “Sindicato não encontrado”)
3. `https://sindigest.stellarsolucoes.com.br/` → mesmo app
4. Login `admin@sindprf.local`
5. Network: API em `apisindigest...` + header `X-Tenant-Host: sindprf.stellarsolucoes.com.br` (ou `sindigest...`)

---

## 6. Depois: domínio próprio do cliente

1. DNS do cliente → `187.127.42.128`
2. NPM: novo Proxy Host → `187.127.42.128:8081`
3. `INSERT` em `tenant_domains` daquele tenant
4. API continua em `apisindigest...` (o front manda `X-Tenant-Host`)

---

## Comandos úteis

```bash
docker compose logs -f api
docker compose up -d api                    # mudou WEB_URL / env
docker compose up --build -d web            # mudou VITE_API_URL
docker compose down
```
