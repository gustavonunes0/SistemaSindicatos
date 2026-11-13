# Plano de Refatoração — SindiGest / SINDPRF-CE

> Auditoria técnica de 13/11/2026 sobre o estado atual do working tree.
> Os eixos são segurança, performance, rastreabilidade/observabilidade, qualidade e testes.
> Referências `arquivo:linha` valem para este snapshot e podem deslocar após edições.
> Itens marcados **[hipótese]** não foram confirmados em execução e precisam de verificação antes de qualquer correção.
> **Nenhum código foi alterado nesta etapa.**

---

## 1. Resumo executivo — 5 riscos críticos

1. **Segredos de produção versionados no Git.** `.env`, `apps/api/.env` e `apps/web/.env` estão no índice, mesmo com o `.gitignore` os excluindo, porque foram adicionados antes da regra. O histórico (commits `a2a2259`, `2c87f05`, `82cc9e7`) contém `DATABASE_URL`/`DIRECT_URL` do Supabase, `JWT_SECRET`, `VAPID_PRIVATE_KEY` e `SEED_ADMIN_SENHA`. O remoto é `github.com/gustavonunes0/SistemaSindicatos`. Quem tiver acesso ao repo pode ler o banco inteiro e forjar JWT de qualquer usuário, inclusive SUPERADMIN.
2. **Cadeia XSS → sequestro de sessão.** O HTML de notícias é gravado sem sanitização (`packages/types/src/noticia.ts:39-41`) e renderizado com `dangerouslySetInnerHTML` (`apps/web/src/features/noticias/components/NoticiaDetalhePage.tsx:76`). Os tokens (access e refresh) ficam no `localStorage` (`apps/web/src/features/auth/store.ts:14-24`). Um ADMIN comprometido ou malicioso pode, portanto, roubar a sessão de todos os afiliados e admins que abrirem a notícia.
3. **Token de reset de senha em log em texto claro.** `apps/api/src/auth/auth.service.ts:114` grava `Token de reset para ${email}: ${token}`, e não existe envio de e-mail. Na prática, quem tem acesso aos logs do Docker consegue redefinir a senha de qualquer conta.
4. **Isolamento multi-tenant incompleto em escritas.** A extensão Prisma só injeta `tenantId` em `updateMany`/`deleteMany` (`apps/api/src/prisma/tenant.extension.ts:134-147`). Os `update`/`delete`/`upsert` singulares por `{ id }` não são filtrados, e há cerca de 25 ocorrências em 17 services, por exemplo `afiliados.service.ts:395` (troca de status) e `imoveis.service.ts:104-117`. Somado a isso, `X-Tenant-Host` tem prioridade absoluta (`apps/api/src/tenant/tenant.service.ts:52-55`). Um ADMIN do tenant A pode alterar ou apagar registros do tenant B se conhecer o ID.
5. **Dados pessoais expostos sem controle de acesso.** O diretório `/uploads` é servido estaticamente sem autenticação (`apps/api/src/bootstrap.ts:67`) e o middleware de tenant o ignora (`tenant.middleware.ts:21-24`). Lá ficam rubrica de assinatura, anexos de formulários públicos e capas. Além disso, estão versionados PDFs D8 de folha de pagamento (`5 - D8 Servidor - Maio 2026.pdf`, `5 - D8 Pensionista - Maio 2026.pdf`) e `tmp-sync-contatos-resultado.json`, com nome e IDs de cerca de 800 afiliados. Isso é risco direto de LGPD.

Riscos altos que vêm logo em seguida:
- `npm audit` reporta **1 crítica e 23 altas**: `proxy-addr`, `multer`, `@nestjs/platform-express`, `body-parser`, `axios`, `nodemailer`, `xlsx` (sem correção upstream), `vite`, `react-router` e outras.
- Importações jurídica e D8 fazem N+1 e carregam a base inteira em memória.
- Não há trilha de auditoria para ações destrutivas, como o `user.deleteMany` do D8 em `d8.service.ts:250-265`.

---

## 2. Mapa do sistema

```
                    ┌─────────────────────── Nginx Proxy Manager (TLS) ───────────────────────┐
 sindprfce.com.br ──┤  web :8081 (nginx estático, bundle Vite)                                │
 sindigest.stellar… ┤  apisindigest.stellarsolucoes.com.br → api :3002 (NestJS, Docker)       │
                    └──────────────────────────────────────────────────────────────────────────┘
                                         │ Prisma (pooler)
                                         ▼
                              PostgreSQL (Supabase) — banco único, coluna tenantId
                              Disco local: apps/api/uploads (público) + uploads-private
 Integrações: Instagram Graph API (cron 1h) · Web Push (VAPID) · Resend/SMTP (contato)
```

### Monorepo (npm workspaces)

| Pacote | Papel |
|---|---|
| `apps/api` | NestJS 10, Prisma 6.19, 41 models, 29 migrations, aplicadas no entrypoint Docker (`scripts/docker-api-entrypoint.sh:7-8`) |
| `apps/web` | React 18, Vite 6, TanStack Query 5, Zustand 5, Tiptap 3, pdfjs 4, PWA |
| `packages/types` | Schemas Zod compartilhados (`@sindprf/types`) |
| `packages/config` | Configurações compartilhadas |

### Módulos da API e prefixos de rota

`admin`, `afiliados`, `alertas`, `auth`, `balancetes`, `contato`, `convenios` (inclui `declaracoes`), `d8`, `diretoria`, `eleicoes` (eleição, votação, apuração, chapas, contestações), `estatutos`, `financeiro`, `formularios`, `imoveis`, `instagram`, `juridico`, `noticias`, `plataforma` (SUPERADMIN), `push`, `solicitacoes`, `tenants`, além de `prisma`, `storage` e `tenant` como infraestrutura.

### Front-end

Organizado por feature em `apps/web/src/features/*`, com 24 features espelhando os módulos. As rotas são `lazy` em `router.tsx`, exceto `HomePage`.

### Fluxo de uma requisição

1. `TenantMiddleware` resolve o host. A ordem de prioridade é `X-Tenant-Host`, depois `Origin`/`Host`, e o resultado é cacheado em um `Map`.
2. `TenantAlsInterceptor` grava o tenant em AsyncLocalStorage.
3. Rodam os guards globais `JwtAuthGuard` (verifica se o tenant do JWT bate com o da requisição) e `RolesGuard`.
4. `ZodValidationPipe` valida a entrada.
5. O service usa o Prisma estendido, por onde passam `tenant.extension` e `perfil.extension`.
6. `PerfilInterceptor` registra no log as requisições acima de 700 ms.

### Jobs agendados

| Job | Local | Comportamento |
|---|---|---|
| `EleicaoCron.fecharEleicoesVencidas` | `eleicao/eleicao.cron.ts:14-22` | A cada hora; `updateMany` global, sem tenant |
| `InstagramService.sincronizar` | `instagram.service.ts:132-154` | A cada hora; percorre os tenants e também roda no boot (`:59-60`) |
| Renovação do token do Instagram | `instagram.service.ts:321-339` | Guarda o token novo só em memória |

---

## 3. Achados

**Severidade:** C = Crítica, A = Alta, M = Média, B = Baixa.
**Esforço:** P = até 1 dia, M = 2 a 5 dias, G = mais de 1 semana.

### 3.1 Segurança (S)

| ID | Eixo | Descrição | Local (arquivo:linha) | Sev. | Esf. | Impacto esperado |
|---|---|---|---|---|---|---|
| S01 | Segurança | `.env` com segredos de produção versionado e presente no histórico | `git ls-files`: `.env`, `apps/api/.env`, `apps/web/.env`; `.gitignore:11-13` | C | P | Elimina o vazamento de credenciais do banco, do JWT e do VAPID |
| S02 | Segurança | Stored XSS: HTML de notícia sem sanitização | `packages/types/src/noticia.ts:39-41`; `NoticiaDetalhePage.tsx:76` | C | P | Bloqueia a execução de script no site público |
| S03 | Segurança | Access e refresh token no `localStorage` (default do `persist`), legíveis por qualquer XSS | `apps/web/src/features/auth/store.ts:14-24` | A | G | Reduz o dano de XSS; com cookie httpOnly o token deixa de ser legível |
| S04 | Segurança | Token de reset de senha em log; fluxo sem e-mail | `apps/api/src/auth/auth.service.ts:96-114` | C | P/M | Fecha a tomada de conta via log |
| S05 | Segurança | Extensão de tenant não cobre `update`/`delete`/`upsert` singulares | `tenant.extension.ts:134-147`; ex. `afiliados.service.ts:395,408`, `imoveis.service.ts:104-117`, `solicitacoes.service.ts:135-138` | A | M | Impede escrita cross-tenant por ID |
| S06 | Segurança | `X-Tenant-Host` confiado antes de `Host`/`Origin`, aceito de qualquer cliente | `tenant.service.ts:52-55`; CORS expõe o header em `bootstrap.ts:60-65` | A | P | Impede direcionar rotas públicas (cadastro, formulários, push) para outro tenant |
| S07 | Segurança | `/uploads` estático sem autenticação nem tenant | `bootstrap.ts:67`; `tenant.middleware.ts:21-24`; `local-storage.service.ts:13-19` | C | M | Arquivos sensíveis passam a exigir autorização |
| S08 | Segurança / LGPD | PDFs D8 (folha) e resultado de sync com dados de afiliados versionados | raiz: `5 - D8 Servidor - Maio 2026.pdf`, `5 - D8 Pensionista - Maio 2026.pdf`, `tmp-sync-contatos-resultado.json` | C | P | Remove dados pessoais do repositório |
| S09 | Segurança | 1 vulnerabilidade crítica e 23 altas em dependências (`proxy-addr`, `multer`, `@nestjs/platform-express`, `body-parser`, `axios`, `nodemailer`, `vite`, `react-router`, `@tiptap/core`, `zod`, `prisma`) | `npm audit --omit=dev` | A | M | Fecha CVEs conhecidas |
| S10 | Segurança | `xlsx` 0.18.5 com CVEs (prototype pollution e ReDoS) sem correção no npm | `apps/api/package.json`; uso em `juridico.service.ts:109-117` | A | M | Troca por `exceljs` ou pelo build oficial do SheetJS via CDN |
| S11 | Segurança | Upload validado só por `mimetype` declarado pelo cliente, sem verificar magic bytes | `afiliados.controller.ts:98-101`; `noticias.controller.ts:115-116`; `formularios.controller.ts:185-186` | M | P | Evita polyglots e SVG/HTML disfarçados |
| S12 | Segurança | Upload de formulário público grava em storage público | `formularios.controller.ts:171-192` | A | P | Respostas de formulário deixam de ser públicas |
| S13 | Segurança | Push `subscribe`/`unsubscribe` públicos; `unsubscribe` apaga por `endpoint` sem `tenantId` | `push.controller.ts:30-47`; `push.service.ts:50` | A | P | Evita spam e cancelamento de inscrição alheia |
| S14 | Segurança | `ThrottlerGuard` não é global; só auth, cadastro, contato e formulários têm limite | `app.module.ts:40-43,76-77` | M | P | Rate limit padrão em toda a API |
| S15 | Segurança | Código de validação de declaração com 40 bits (`randomBytes(5)`) em rota pública sem throttle | `convenios.service.ts:462`; `convenios.controller.ts` (`GET declaracoes/:codigo`) | M | P | Dificulta enumerar declarações |
| S16 | Segurança | Recuperação de senha exige e-mail, mas o afiliado faz login por CPF | `packages/types/src/auth.ts:43-45`; `auth.service.ts:37-52` | A | M | Afiliados conseguem recuperar o acesso |
| S17 | Segurança | `JwtAuthGuard` pula o vínculo de tenant quando `request.tenant` está ausente | `jwt-auth.guard.ts:61-63` | M | P | Falha fechada em vez de aberta **[hipótese: rotas sem middleware]** |
| S18 | Segurança | Contagem de votos visível ao ADMIN durante a votação | `eleicao.controller.ts:211-214`; `votacao.service.ts:137-141` | M | P | Conformidade com `.cursor/rules/eleicao.mdc` |
| S19 | Segurança | Credencial padrão `Admin@123` no seed, README e CI | `prisma/seed.ts:13`; `README.md:28`; `ci.yml:31` | B | P | Evita seed com senha conhecida em produção |
| S20 | Segurança | `@Param('id')` sem validação de formato em praticamente todos os controllers | ex. `solicitacoes.controller.ts:54-55` | B | M | Erros 400 previsíveis em vez de erros Prisma |
| S21 | Segurança | Helmet sem CSP no front (nginx) **[hipótese: `Dockerfile.web`/nginx sem cabeçalho CSP]** | `bootstrap.ts:34-37`; configuração nginx do web | M | M | Defesa em profundidade contra XSS |

### 3.2 Performance (P)

| ID | Eixo | Descrição | Local (arquivo:linha) | Sev. | Esf. | Impacto esperado |
|---|---|---|---|---|---|---|
| P01 | Performance | Corpo JSON no limite padrão de 100 kb do Express, mas o preview financeiro, D8 e balancete enviam o texto inteiro do PDF **[hipótese: confirmar o 413 com um PDF grande]** | `bootstrap.ts:30-68` (sem `json({limit})`); `packages/types/src/financeiro.ts:38-40`; `d8.ts:78-79` (sem `.max`) | A | P | Importações grandes param de falhar; limite explícito e coerente |
| P02 | Performance | Importação jurídica faz um `upsert` por linha dentro de transação | `juridico.service.ts:151-192` | A | M | De N queries para lotes; risco menor de timeout da transação |
| P03 | Performance | Detalhe do D8 carrega todos os afiliados e todas as linhas da competência | `d8.service.ts:70-74,445-465` | A | M | Memória e latência constantes com a base crescendo |
| P04 | Performance | `linhaD8.findMany` sem paginação | `d8.service.ts:97-103` | A | P | Payload controlado |
| P05 | Performance | Sync do Instagram com `upsert` por post, rodando a cada hora, em todos os tenants e no boot | `instagram.service.ts:59-60,162-200` | A | M | Menos picos de banco no deploy e no cold start |
| P06 | Performance | Push busca todas as inscrições e envia tudo com `Promise.all` sem limite | `push.service.ts:59,75-97` | A | M | Evita rajada de HTTP e de deletes |
| P07 | Performance | Respostas de formulário com `take: 2000` incluindo JSON completo | `respostas.service.ts:86-98` | M | M | Paginação real |
| P08 | Performance | Listagens sem `take` em elegíveis, imóveis, convênios públicos e jurídico do afiliado | `elegibilidade.service.ts:30-38`; `imoveis.service.ts:124-151`; `convenios.service.ts:216-220`; `juridico.service.ts:101-104,221-224` | M | M | Payloads previsíveis |
| P09 | Performance | Índices faltando: `Eleicao(status,fim)`, `SolicitacaoAluguel(tenantId,status)`, `AcaoJuridica(tenantId,updatedAt)` | `schema.prisma:762,1018,398` vs `eleicao.cron.ts:16`, `admin.service.ts:32-35`, `juridico.service.ts:85` | M | P | Consultas de dashboard e cron mais rápidas |
| P10 | Performance | Busca `contains` (ILIKE `%x%`) sem `pg_trgm` **[hipótese: relevante só com volume]** | `financeiro.service.ts:264-268` e similares | B | M | Busca textual escalável |
| P11 | Performance | Caches em `Map` por instância, sem teto de chaves (afiliados indexa por página e filtro) | `noticias.service.ts:51`; `convenios.service.ts:71`; `afiliados.service.ts:105`; `admin.service.ts:8`; `tenant.service.ts:18` | M | M | Consistência ao escalar horizontalmente; memória limitada |
| P12 | Performance | Anexo de notícia de até 50 MB inteiro em memória (Multer `memoryStorage`) | `noticias.controller.ts:34,124` | M | M | Evita pico de RAM com uploads concorrentes |
| P13 | Performance | `readFileSync`/`existsSync` de logos a cada PDF gerado | `declaracao-pdf.service.ts:58,115,214`; `afiliados.service.ts:34-46,367-369` | B | P | Sem bloqueio do event loop |
| P14 | Performance | Sem `compression` na API; endpoints públicos de convênios, imóveis e Instagram sem `Cache-Control` | `bootstrap.ts`; `convenios.controller.ts:87-96` | M | P | Menos banda; CDN e navegador passam a cachear |
| P15 | Performance | `index.css` monolítico com 14.025 linhas (~262 KB) no bundle inicial | `apps/web/src/index.css`; `main.tsx:10` | M | G | Menor CSS crítico, LCP melhor |
| P16 | Performance | Assets públicos pesados: `logo-sindicato.png` com 1,56 MB, `pwa-512.png` com 297 KB | `apps/web/public/` | M | P | LCP e cache de PWA menores |
| P17 | Performance | `HomePage` sem lazy e sem `manualChunks` | `router.tsx:6`; `vite.config.ts:70-74` | B | P | Bundle inicial menor |
| P18 | Performance | CORS consulta o banco para cada origem desconhecida | `bootstrap.ts:52` → `tenant.service.ts:315` | B | P | Preflights sem consulta ao banco |

### 3.3 Rastreabilidade e observabilidade (R)

| ID | Eixo | Descrição | Local (arquivo:linha) | Sev. | Esf. | Impacto esperado |
|---|---|---|---|---|---|---|
| R01 | Rastreabilidade | Sem trilha de auditoria (nenhum model `AuditLog`); mudanças de status de afiliado, homologação, ações da plataforma e importações não registram quem fez | `schema.prisma` (ausente); `afiliados.service.ts:393-396`; `chapa.service.ts:74-79`; `tenant.service.ts:161-274` | A | G | Responder "quem fez o quê e quando" |
| R02 | Rastreabilidade | D8 "substituir base" faz `user.deleteMany` sem registro nem usuário importador | `d8.service.ts:250-265`; `ImportacaoD8` em `schema.prisma:319-328` | C | M | Exclusão em massa auditável e reversível |
| R03 | Observabilidade | Sem request/correlation ID | ausente em `bootstrap.ts` e `perfil.interceptor.ts:20-48` | A | P | Correlacionar logs entre front, API e banco |
| R04 | Observabilidade | Logs em texto livre (sem JSON); `Logger` usado em só 8 arquivos | `new Logger` em `instagram`, `votacao`, `solicitacoes`, `perfil`, `contato`, `auth`, `eleicao.cron`, `push` | M | M | Logs consultáveis em agregador |
| R05 | Observabilidade | Sem exception filter global; erros 500 sem contexto (tenant, usuário, rota) | `app.module.ts:72` (só `MulterExceptionFilter`) | A | P | Diagnóstico rápido em produção |
| R06 | Observabilidade | Health em `GET /` estático, sem checar o banco; healthcheck do Docker idem | `app.controller.ts:7-13`; `docker-compose.yml:80-85` | A | P | Detectar banco fora do ar e evitar container "saudável" quebrado |
| R07 | Observabilidade | Front sem ErrorBoundary nem reporte de erros | `apps/web/src` (sem ocorrências) | A | P | Tela branca vira mensagem amigável com erro reportado |
| R08 | Observabilidade | Sem APM nem métricas (Sentry/OTel/Prometheus) | `apps/api/package.json`, `apps/web/package.json` | M | M | Visibilidade de latência e erros |
| R09 | Observabilidade | Versão `0.0.0` e nenhum git SHA exposto | `apps/api/package.json:3`; `apps/web/package.json:3` | B | P | Saber qual build está em produção |
| R10 | Observabilidade | Falhas de login, aprovação de afiliado, importação financeira e declarações sem log | `auth.service.ts:31-32`; `afiliados.service.ts:393`; módulo `financeiro`; `declaracoes.service.ts` | M | P | Detectar abuso e incidentes |
| R11 | Observabilidade / LGPD | PII em logs (nome do afiliado, e-mail de contato) | `solicitacoes.service.ts:88-89`; `contato.service.ts:80-81,122-124` | M | P | Conformidade com LGPD |
| R12 | Rastreabilidade | `EleicaoCron` sem `try/catch`, sem tenant no log e sem alerta | `eleicao.cron.ts:14-22` | M | P | Falha do cron passa a ser visível |
| R13 | Rastreabilidade | Token do Instagram renovado só em memória; perdido a cada restart | `instagram.service.ts:335-337` | B | P | Evita expiração silenciosa do feed |

### 3.4 Qualidade, arquitetura e testes (Q)

| ID | Eixo | Descrição | Local (arquivo:linha) | Sev. | Esf. | Impacto esperado |
|---|---|---|---|---|---|---|
| Q01 | Testes / CI | CI roda só E2E; `test:unit` (financeiro, parsers) fica fora; sem `npm audit`, typecheck dedicado nem secret scan | `.github/workflows/ci.yml:58-65` | A | P | Regressões e segredos barrados no PR |
| Q02 | Testes | Web sem nenhum teste (sem vitest/jest) | `apps/web/package.json` | M | M | Proteger hooks e fluxos críticos de UI |
| Q03 | Testes | Sem teste de isolamento cross-tenant | `apps/api/test/` | A | M | Garante S05 e S06 de forma permanente |
| Q04 | Qualidade | CNPJ e presidente hardcoded no PDF de declaração (não é multi-tenant) | `declaracao-pdf.service.ts:8-9,177,229` | M | P | Declarações corretas para outros sindicatos e na troca de gestão |
| Q05 | Qualidade | `moduleResolution: node10` deprecado (TS5107) | `apps/api/tsconfig.json` | B | P | Compatibilidade com TS 6 |
| Q06 | Qualidade | Services grandes misturam regra, I/O e cache (ex. `d8.service.ts`, `instagram.service.ts`, `convenios.service.ts`) **[hipótese: avaliar a divisão caso a caso]** | arquivos citados | B | G | Manutenção e testabilidade |
| Q07 | Qualidade | Documentação de deploy manda rodar `migrate deploy` manualmente, mas o entrypoint já faz isso; migrations foram aplicadas em produção a partir da máquina de dev | `docs/deploy-vps.md:105-107`; `scripts/docker-api-entrypoint.sh:7-8` | B | P | Um único caminho de migração, auditável |
| Q08 | Qualidade | Sem virtualização em tabelas admin grandes | `apps/web` (sem `react-window`/`@tanstack/virtual`) | B | M | UI fluida com milhares de linhas |

### O que já está bem

Isto não deve regredir na refatoração:
- Refresh token com rotação e hash.
- bcrypt para senhas.
- `JWT_SECRET` obrigatório via `getOrThrow`.
- Sigilo do voto: `Voto` não tem `afiliadoId` e há `@@unique` em `Comparecimento`.
- Resultado da eleição só aparece após `APURADA`.
- Documentos de filiação em storage privado, com proteção contra path traversal.
- Zod na maioria dos bodies.
- Nenhum `$queryRawUnsafe`.
- Paginação em afiliados e no detalhe financeiro.
- `createMany` em lotes no D8.
- Rotas do front com lazy loading e libs pesadas (pdfjs, Tiptap) fora do bundle inicial.
- Migrations automáticas no container.

---

## 4. Plano de execução em fases

### Fase 0 — Contenção imediata (1 a 2 dias, sem refatoração estrutural)

Objetivo: fechar o que é explorável hoje, com mudanças pequenas e reversíveis.

**0.1 Rotacionar segredos e tirar `.env` do Git (S01)**
- **O que:**
  1. Trocar a senha do banco Supabase, o `JWT_SECRET` (isso derruba todas as sessões) e o par VAPID (exige que os clientes se inscrevam de novo no push).
  2. Rodar `git rm --cached .env apps/api/.env apps/web/.env`.
  3. Purgar o histórico com `git filter-repo` e fazer force-push, combinado com o time.
- **Por quê:** credenciais completas de produção estão no histórico.
- **Como validar:**
  - `git log --all -- .env` volta vazio.
  - O app sobe com os segredos novos.
  - Um JWT antigo recebe 401.
  - `gitleaks detect` limpo.
- **Dependências:** nenhuma. **A rotação vem antes da purga**, porque purgar não desfaz um vazamento que já aconteceu.

**0.2 Remover dados pessoais do repositório (S08)**
- **O que:**
  1. Tirar do Git os PDFs D8 e o `tmp-sync-contatos-resultado.json`, junto com a purga de 0.1.
  2. Adicionar ao `.gitignore` os padrões `*.D8*.pdf` e `tmp-*.json`.
  3. Avaliar se os demais PDFs da raiz (estatuto, instruções eleitorais) são públicos.
- **Por quê:** LGPD.
- **Como validar:** `git ls-files | rg -i "d8|tmp-"` volta vazio.
- **Dependências:** 0.1, para fazer uma única reescrita de histórico.

**0.3 Remover o log do token de reset (S04, parte P)**
- **O que:** apagar a linha `auth.service.ts:114`, ou logar só o `userId`.
- **Por quê:** é tomada de conta a partir dos logs.
- **Como validar:** `rg "Token de reset" apps/api` volta vazio. O e-mail de reset fica para 1.6.
- **Dependências:** nenhuma.

**0.4 Sanitizar HTML de notícias (S02)**
- **O que:**
  1. No servidor, sanitizar com `sanitize-html` usando uma allowlist das tags que o Tiptap gera, ao criar e ao atualizar.
  2. No front, aplicar DOMPurify antes do `dangerouslySetInnerHTML`.
  3. Rodar um script único que re-sanitiza as notícias já existentes.
- **Por quê:** é o XSS armazenado que alimenta a cadeia de sequestro de sessão (S03).
- **Como validar:**
  - Teste unitário: `<img src=x onerror=alert(1)>` e `<script>` são removidos.
  - Notícias existentes continuam com a mesma aparência (conferência manual de 5 notícias).
- **Dependências:** nenhuma.

**0.5 Atualizar dependências com correção disponível (S09)**
- **O que:** `npm audit fix` sem `--force`, e depois bumps pontuais de `@nestjs/platform-express`, `multer`, `axios`, `nodemailer`, `vite` 6.x patch e `react-router` 7.x patch.
- **Por quê:** fecha a vulnerabilidade crítica de `proxy-addr` e as altas.
- **Como validar:**
  - `npm audit --omit=dev` sem críticas.
  - CI verde.
  - Smoke manual de login, upload de notícia e importação financeira.
- **Dependências:** nenhuma. `zod` 4 e `prisma` 7 ficam para a Fase 3 porque são majors.

**0.6 Fechar `X-Tenant-Host` para clientes externos (S06)**
- **O que:**
  1. Só aceitar o header quando vier de um proxy confiável, via env `TRUSTED_PROXY_SECRET` ou removendo o header no Nginx Proxy Manager.
  2. Caso contrário, usar `Origin`/`Host`.
  3. Atualizar `.env.example`.
- **Por quê:** impede direcionar rotas públicas a outro tenant.
- **Como validar:**
  - `curl -H "X-Tenant-Host: outro" /tenants/current` retorna o tenant do `Host`.
  - O SindiGest e o site do sindicato continuam resolvendo certo.
- **Dependências:** **[hipótese]** confirmar se o front ou o painel da plataforma depende hoje desse header (`apps/web/src/lib/http.ts`).

### Fase 1 — Fundações de segurança e observabilidade (1 a 2 semanas)

**1.1 Tenant em todas as escritas (S05, Q03)**
- **O que:**
  1. Estender `tenant.extension.ts` para `update`, `delete` e `upsert`: buscar com `findFirst({ id, tenantId })` antes, ou converter em `updateMany`/`deleteMany` e checar `count`.
  2. Criar um teste E2E cross-tenant que cobre afiliado, imóvel, notícia, solicitação e convênio.
- **Por quê:** fecha escritas entre tenants.
- **Como validar:** o E2E com um ADMIN do tenant A tentando PATCH/DELETE em um ID do tenant B recebe 404, e as suítes atuais continuam passando.
- **Dependências:** 0.6.

**1.2 Storage privado por padrão (S07, S12)**
- **O que:**
  1. Separar o storage em público (capas, fotos de imóveis, logos) e privado (rubrica, anexos de formulário, documentos).
  2. Servir os arquivos privados por um endpoint autenticado com checagem de tenant e de dono.
  3. Migrar os arquivos e as URLs existentes.
- **Por quê:** a rubrica de assinatura e os anexos hoje são públicos.
- **Como validar:**
  - `GET /uploads/<privado>` responde 404.
  - O endpoint autenticado responde 200 ao dono e 403 a outro usuário.
  - As capas continuam públicas.
- **Dependências:** 1.1.

**1.3 Validação de upload por conteúdo (S11)**
- **O que:** checar magic bytes com `file-type`, rejeitar SVG/HTML e normalizar a extensão a partir do tipo detectado.
- **Como validar:** um `.png` que na verdade é HTML recebe 400, e testes unitários cobrem PDF, JPEG, PNG e WEBP.
- **Dependências:** nenhuma.

**1.4 Correlation ID, logger estruturado e filtro global (R03, R04, R05, R11)**
- **O que:**
  1. Adotar `nestjs-pino` com `genReqId` (aceitando `x-request-id` de entrada) e devolver o ID na resposta.
  2. Fazer redact de `authorization`, `senha`, `token` e `cpf`.
  3. Criar um `AllExceptionsFilter` que loga stack, tenant, `userId` e `requestId`, e devolve 500 genérico com o `requestId`.
- **Como validar:**
  - Os logs saem em JSON com `reqId`.
  - Um erro forçado retorna `{ requestId }`, que aparece no log.
  - O teste de redact passa.
- **Dependências:** nenhuma.

**1.5 Health e readiness (R06, R09)**
- **O que:**
  1. `GET /health/live` responde estático.
  2. `GET /health/ready` faz `SELECT 1` e devolve versão e git SHA (build arg).
  3. Healthcheck do Docker passa a usar `/ready`.
- **Como validar:** com o banco desligado, `/ready` responde 503 e o container fica unhealthy.
- **Dependências:** nenhuma.

**1.6 Recuperação de senha funcional (S04, S16)**
- **O que:**
  1. Enviar o reset por e-mail com Resend/SMTP (já configurado em `contato.service.ts`).
  2. Aceitar CPF ou e-mail.
  3. Mascarar o e-mail na resposta e manter a mensagem genérica.
- **Como validar:** E2E com forgot → reset → login, e nenhum token no log.
- **Dependências:** 0.3.

**1.7 Rate limit e superfície pública (S13, S14, S15, S17)**
- **O que:**
  1. Tornar o `ThrottlerGuard` global, com perfis específicos para rotas públicas.
  2. Exigir JWT no push `subscribe`/`unsubscribe` ou amarrar ao tenant.
  3. Aumentar o código de declaração para 16 bytes ou mais (os códigos antigos continuam válidos).
  4. Fazer o `JwtAuthGuard` falhar fechado quando não houver tenant.
- **Como validar:** a 101ª requisição por minuto recebe 429, os QR codes antigos continuam validando e os E2E passam.
- **Dependências:** 0.6.

**1.8 CI de verdade (Q01)**
- **O que:** adicionar ao CI `npm run test:unit`, `tsc --noEmit` nos três pacotes, `npm audit --audit-level=high --omit=dev` e `gitleaks`.
- **Como validar:** um PR com segredo ou com teste quebrado falha no CI.
- **Dependências:** 0.1, para o gitleaks não acusar o histórico.

**1.9 Substituir `xlsx` (S10)**
- **O que:** trocar por `exceljs` no parser jurídico, mantendo `juridico-parser.spec.ts` como rede de segurança.
- **Como validar:** o spec do parser passa e `npm audit` deixa de listar `xlsx`.
- **Dependências:** 1.8 (unit tests no CI).

### Fase 2 — Performance (1 a 2 semanas)

**2.1 Limites de payload coerentes (P01)**
- **O que:**
  1. Definir `json({ limit: '10mb' })` explícito na API.
  2. Colocar `.max()` nos schemas Zod de texto e páginas de PDF.
  3. Mensagem clara de 413 no front, reaproveitando o padrão já usado em notícias.
- **Como validar:** importar um PDF de 50 páginas, e um payload acima do limite recebe 413 tratado.
- **Dependências:** nenhuma.

**2.2 Importação jurídica em lote (P02)**
- **O que:** fazer pré-carga com `findMany` pelas chaves, depois `createMany` para os novos e `update` em lotes de 500 (ou `INSERT … ON CONFLICT` via `$executeRaw` parametrizado).
- **Como validar:** a mesma planilha produz o mesmo resultado no banco (diff de snapshot) e o tempo cai pelo menos 5 vezes, medido pelo `PerfilInterceptor`.
- **Dependências:** 1.9.

**2.3 D8 paginado e "sem desconto" calculado no banco (P03, P04)**
- **O que:** paginar as linhas e calcular a lista de afiliados sem desconto com `NOT EXISTS` em vez de cruzar duas listas em memória.
- **Como validar:** o resultado é igual ao atual para a competência de maio/2026 e o tempo e a memória ficam estáveis.
- **Dependências:** nenhuma.

**2.4 Instagram e push (P05, P06)**
- **O que:**
  1. No Instagram, tirar o sync do boot (ou adiar com jitter) e fazer upsert em transação única por tenant.
  2. No push, enviar em lotes de 50 a 100 com `p-limit` e remover as inscrições expiradas com um único `deleteMany`.
- **Como validar:** o boot da API sem chamadas ao Graph, o feed atualizado e um envio de push para N inscrições sem picos.
- **Dependências:** 1.4, para ter métricas nos logs.

**2.5 Índices, compressão e cache HTTP (P09, P14)**
- **O que:**
  1. Migration com os 3 índices compostos.
  2. `compression` na API.
  3. `Cache-Control: public, max-age=60, stale-while-revalidate=300` nos GET públicos.
- **Como validar:** `EXPLAIN` usa os índices e as respostas saem com `content-encoding: gzip`.
- **Dependências:** nenhuma.

**2.6 Paginação nas listagens restantes (P07, P08)**
- **O que:** aplicar `take`/`cursor` em respostas de formulário, elegíveis, imóveis e jurídico, ajustando os hooks do front.
- **Como validar:** as telas admin funcionam com mais de 1.000 registros de seed.
- **Dependências:** nenhuma.

**2.7 Assets e bundle (P15, P16, P17)**
- **O que:**
  1. Converter o logo para WEBP/AVIF dimensionado (de 1,5 MB para menos de 100 KB).
  2. Usar `HomePage` lazy e `manualChunks` para vendor.
  3. Começar a dividir o CSS por feature, de forma incremental.
- **Como validar:** Lighthouse antes e depois (LCP, tamanho do bundle) e nenhuma regressão visual nas páginas principais.
- **Dependências:** nenhuma.

**2.8 Caches multi-instância (P11)**
- **O que:** adotar uma das duas opções.
  - (a) Documentar formalmente que a API roda com **uma instância só** e pôr um teto LRU nos `Map`.
  - (b) Usar Redis se for escalar.
- **Como validar:** a memória fica estável depois de 10 mil buscas distintas em afiliados.
- **Dependências:** decisão de infraestrutura **[hipótese: hoje só há uma instância na VPS]**.

### Fase 3 — Estrutural e qualidade (contínuo, 3 a 6 semanas)

**3.1 Trilha de auditoria (R01, R02, R10)**
- **O que:**
  1. Criar o model `AuditLog` com `tenantId`, `userId`, `acao`, `entidade`, `entidadeId`, `antes`/`depois` (JSON com PII mascarada), `requestId` e `createdAt`.
  2. Gravar via service explícito nas ações críticas: status de afiliado, D8 substituir base, homologação, plataforma, declarações e importações.
  3. Adicionar `importadoPorId` em `ImportacaoD8`.
- **Como validar:**
  - Cada ação crítica gera uma linha.
  - Tela admin de consulta.
  - Teste E2E.
- **Dependências:** 1.4, que fornece o `requestId`.

**3.2 Sessão em cookie httpOnly (S03)**
- **O que:**
  1. Mover o refresh token para cookie `httpOnly; Secure; SameSite=Lax` com escopo no domínio da API.
  2. Manter o access token só em memória.
  3. Ajustar CORS com `credentials`.
- **Por quê:** é a defesa definitiva contra roubo de sessão por XSS.
- **Como validar:**
  - O token não aparece no `localStorage`.
  - Login, refresh e logout funcionam em `sindprfce.com.br` e no SindiGest.
  - O PWA continua logado.
- **Dependências:** 0.4 e 1.7. **[hipótese]** Como API e web estão em domínios diferentes (`stellarsolucoes.com.br` e `sindprfce.com.br`), o cookie seria de terceiro; pode ser preciso servir a API em `api.sindprfce.com.br`. Isso exige decisão de infraestrutura.

**3.3 Observabilidade de front e APM (R07, R08)**
- **O que:** ErrorBoundary por rota com fallback amigável, e Sentry (ou alternativa) na web e na API com `requestId` como tag.
- **Como validar:** um erro forçado aparece no painel com stack e `requestId`.
- **Dependências:** 1.4.

**3.4 Declaração multi-tenant (Q04)**
- **O que:** mover CNPJ, presidente e razão social para o branding do tenant, editáveis no painel.
- **Como validar:** o PDF gerado continua idêntico para o SINDPRF-CE (comparação visual) e um tenant de teste gera com os próprios dados.
- **Dependências:** nenhuma.

**3.5 Upgrades major (S09)**
- **O que:** um upgrade por PR, isolado: `zod` 4, `prisma` 7, `moduleResolution: bundler/node16` (Q05) e `@nestjs` 11.
- **Como validar:** CI completo e smoke por módulo.
- **Dependências:** 1.8, mais a cobertura de testes de 3.6.

**3.6 Cobertura de testes**
- **O que:** cobrir as lacunas listadas na seção 6, priorizando tenant, auth, D8 e declarações.
- **Dependências:** 1.8.

**3.7 Decomposição de services grandes (Q06)**
- **O que:** separar parser, regra e persistência em D8, Instagram e convênios, só depois de existirem testes que cobrem esses módulos.
- **Dependências:** 3.6.

**3.8 Eleição: contagem só após o encerramento (S18) e cron por tenant (R12)**
- **O que:** aplicar as duas correções, validando contra `.cursor/rules/eleicao.mdc`.
- **Dependências:** nenhuma.

---

## 5. Riscos da refatoração

| Risco | Onde | Mitigação |
|---|---|---|
| Purgar o histórico quebra clones e forks e exige force-push | 0.1, 0.2 | Avisar quem tem clone, fazer backup do repo (`git clone --mirror`) antes e uma única reescrita |
| Rotacionar `JWT_SECRET` desloga todo mundo; rotacionar VAPID invalida as inscrições de push | 0.1 | Janela de baixo uso; aviso no site; o front já se re-inscreve no push no login **[hipótese]** |
| Sanitizar notícias existentes pode remover formatação legítima (iframes de vídeo, estilos) | 0.4 | Allowlist derivada das extensões do Tiptap usadas; rodar o script em dry-run e comparar o HTML antes e depois |
| A extensão de tenant em `update`/`delete` muda a semântica: P2025 vira 404 e há uma query extra por escrita | 1.1 | Suíte E2E completa antes e depois; medir com `PerfilInterceptor` |
| Migrar uploads para privado quebra URLs já gravadas no banco (rubrica, anexos) | 1.2 | Migration de dados com mapeamento; manter fallback de leitura do caminho antigo por um período |
| Fechar `X-Tenant-Host` pode quebrar o painel da plataforma ou o ambiente local | 0.6 | Mapear antes quem envia o header; teste manual nos 3 hosts de produção |
| Trocar `xlsx` por `exceljs` pode mudar a leitura de datas e números das planilhas jurídicas | 1.9 | `juridico-parser.spec.ts` com planilhas reais anonimizadas como fixtures |
| Mover o refresh para cookie entre domínios pode não funcionar sem um subdomínio comum | 3.2 | Decidir a infraestrutura antes (`api.sindprfce.com.br`); feature flag para conviver com o modo atual |
| Upgrades major (Zod 4, Prisma 7) mexem em tipos compartilhados de todo o monorepo | 3.5 | Um upgrade por PR, só depois de 1.8 e 3.6 |
| Lote no jurídico ou D8 altera a ordem dos efeitos ou o comportamento parcial em erro | 2.2, 2.3 | Snapshot do banco antes e depois com o mesmo arquivo; manter a transação |
| As migrations rodam automaticamente no boot; um índice pesado pode travar a subida | 2.5 | `CREATE INDEX CONCURRENTLY` em migration SQL manual; aplicar fora do horário de pico |

---

## 6. Lacunas de teste

Hoje existem 4 arquivos de teste:
- `fluxos-criticos.e2e-spec.ts`, com 13 casos (auth básico, cadastro e aprovação, aluguel e eleição).
- `financeiro-parser.spec.ts`, `financeiro.service.spec.ts` e `juridico-parser.spec.ts`. **Nenhum desses três roda no CI.**
- A web não tem nenhum teste.

| Prioridade | Área | O que falta testar | Protege |
|---|---|---|---|
| 1 | Isolamento de tenant | ADMIN A lendo, alterando ou apagando recurso de B; `X-Tenant-Host` forjado; JWT de A no host B | S05, S06, S17 |
| 1 | Sanitização | Payloads XSS em notícia (create, update e legado) | S02 |
| 1 | Auth | forgot e reset ponta a ponta; throttle de login; refresh reutilizado é revogado; logout | S04, S14, S16 |
| 1 | Uploads | Tamanho (413), MIME falso, arquivo privado inacessível sem auth, path traversal | S07, S11, S12 |
| 2 | D8 | Importação, inativação de ausentes e substituição de base (contagem de deletes, auditoria) | P03, R02 |
| 2 | Declarações | Emissão (filiação e convênio, já assinada ou pendente), validação pública por código, download só pelo dono | Q04, S15 |
| 2 | Jurídico | Parser com planilha real anonimizada e paridade após a troca de lib e o lote | S10, P02 |
| 2 | Plataforma | Só SUPERADMIN cria e edita tenant e domínio | R01 |
| 3 | Eleição | Contagem bloqueada durante a votação; cron encerrando por tenant | S18, R12 |
| 3 | Push e Instagram | Envio em lote, limpeza de expiradas, renovação de URL do CDN | P05, P06 |
| 3 | Web | Vitest + Testing Library para `useEnvioArquivo`, `resolverApiUrl`, store de auth e ErrorBoundary; Playwright para login, notícia e declaração | R07, S03 |

**Pré-requisito comum:** colocar `test:unit` no CI (item 1.8) e criar uma factory de seed com dois tenants para os testes de isolamento.
