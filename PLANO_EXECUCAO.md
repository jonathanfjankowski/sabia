# Plano de Execução — Sabiá

> Comparativo entre o estado atual e a spec `sabia_spec_v3.md`, com plano completo em fases.

## Status Geral

- **Backend Laravel**: 100% não implementado — o diretório raiz contém apenas `sabia_spec_v3.md` e `sabia-frontend/`.
- **Frontend React**: bastante completo visualmente (todas as páginas admin/KB/chat), mas roda 100% contra mocks **MSW ativados inclusive em produção** (`src/main.tsx:8`), mascarando a ausência de backend.
- **Widget embedável**: não existe como produto — há apenas uma página interna de demo (`/widget-demo`, sob login).

## Premissas Confirmadas

- Backend: **Laravel 12.x** (current) + Sanctum + pgvector, **sem Spatie Permission** (middlewares de role escritos à mão conforme a spec).
- Widget: **script + iframe** — tela `/widget` pública no app React + `sabia-widget.js` (Vite library mode) que injeta o iframe com token via `data-attribute`.
- Quick win MSW: corrigir `main.tsx:8` imediatamente (Fase 0).

---

## FASE 0 — Quick wins e setup (1–2 dias)

| # | Item | Esforço | Dependências |
|---|---|---|---|
| 0.1 | Corrigir `src/main.tsx:8`: `if (import.meta.env.DEV)` em vez da condição atual | 5min | — |
| 0.2 | Adicionar `ErrorBoundary` global + `React.lazy`/`Suspense` para rotas admin | 0.5d | — |
| 0.3 | Scaffold `sabia-api/` com `composer create-project laravel/laravel sabia-api`; instalar Sanctum + pgvector; PHP 8.4 + Postgres 15 local | 0.5d | — |
| 0.4 | `.env.example` (DB, `ALLOWED_ORIGINS`, `SANCTUM_STATEFUL_DOMAINS`) + Docker Compose (`postgres+pgvector`, `app`, `web`) opcional | 0.5d | 0.3 |

**Entregáveis**: app React fala com backend real quando existir (em dev mantém MSW); app Laravel em `localhost:8000`; Postgres 15 + pgvector em container.

---

## FASE 1 — Backend núcleo + segurança (3–4 dias)

### 1.1 Migrations (seção 3 da spec) — ordem por FK
```
profiles → categories → articles → article_versions → article_chunks (pgvector)
                                  → conversations → messages → knowledge_gaps
widget_settings, brand_settings, ai_settings (singletons)
audit_logs, system_logs
```
- Todos os índices da spec (GIN `to_tsvector`, HNSW, etc.)
- Seed mínimo: 1 gestor, 4 categorias, 3 artigos (para testar RLS)

### 1.2 Models (12) com `$casts`, `$fillable`, relações; scopes `active`, `publicOnly`, `internalOnly`

### 1.3 RLS (seção 4)
- Migration `create_roles`: `sabia_internal`, `sabia_widget`
- Migration `enable_rls` com todas as policies da spec
- Teste SQL puro via `psql` provando que widget não enxerga `internal`

### 1.4 Middleware
- `SetRlsContext` — `SET LOCAL app.current_user_id` / `app.current_session_id` dentro de transação
- `CheckRole` (`role:gestor`, `role:operador`)
- `CheckAccessLevel` — lê `access_level` da conversa/artigo
- `CheckWidgetOrigin` (seção 9.4) — validar `Origin` vs `widget_settings.allowed_domains`
- `SecurityHeaders` (HSTS, CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy)
- `Throttle` override p/ login (5/15min) e chat (100/min, widget 30/min)

### 1.5 Auth Sanctum
- `AuthController` (login/logout/me)
- Log de tentativas falhas em `system_logs`
- Tokens widget `abilities:widget` (Sanctum `createToken(name, ['widget'])`)

### 1.6 Config (seção 9.2, 9.3, 9.8)
- `config/cors.php` lendo `ALLOWED_ORIGINS`
- `config/security.php` headers
- `Encryptable` cast p/ `ai_settings.api_key` (AES-256 via `Illuminate\Encryption\Encrypter`)

### 1.7 AuditService + SystemLog
- Helpers `Audit::record(...)` e `SystemLog::log(...)` usados nas fases seguintes

**Critério de aceite**: `psql` direto confirma RLS; `curl` de login devolve token; `X-Frame-Options: DENY` presente em qualquer endpoint.

---

## FASE 2 — RAG, IA e chat interno (4–5 dias)

### 2.1 Services AI (seção 5.2)
```
AIProviderInterface          (chat(): Generator, analyzeImages, embed, summarize)
GeminiProvider               (gemini-2.0-flash, embed-001)
OpenAIProvider               (gpt-4o)
AnthropicProvider            (claude)
AIProviderFactory            (match settings->provider)
EmbeddingService             (cache em Redis ou noop)
VectorSearchService          (PG cosine ops, top-N, HNSW)
ArticleChunkService          (split por chunk_size/overlap, reembedding em save)
```
Usar HTTP client nativo Laravel (`Http::withToken`) + `stream()` do PHP p/ gerar Generator.

### 2.2 Services de prompt
- `PromptInjectionDetector` (regex da spec seção 5.5) → log em `system_logs`
- `ScopeGuardService` — system prompt base (Bsoft TMS) com delimitadores `{chunks}` (seção 5.6)
- `ConfidenceEvaluator` (seção 5.4: high/low/none)

### 2.3 Controllers + rotas internas
- `POST /api/chat` (StreamedResponse SSE, seção 5.3)
- `GET/POST /api/conversations*`, `messages`, `close` (com rating), `transfer`, `export` TXT (formato spec seção 8)
- `GET /api/articles`, `:slug`, `:id/related`, `:id/feedback`, `categories`, `/search` híbrida (`to_tsvector` + pgvector)
- `POST /api/admin/articles` (CRUD), `import`, **`preview-import`**, `versions`, `revert`
- `POST /api/admin/settings/ai/test-prompt` — stream anônimo p/ testar prompt

### 2.4 Front conecta backend
- `lib/api.ts`: ler `VITE_API_URL` em prod (default `https://api...`)
- Remover handlers MSW correspondentes (ou manter como fallback dev com flag)
- `useChat.ts`: adicionar **timeout** (60s sem `[DONE]` aborta), reconexão com backoff exponencial (3 tentativas), `onError` exibe Toast visível
- `Chat.tsx`: fluxo de **avaliação + sugestão de artigos relacionados** ao encerrar (`GET /articles/related` por tema da conversa)
- `Chat.tsx`: fluxo de **transferência** — verificar horário via `widget_settings`; dentro → `window.open(support_link` com placeholders `{NOME}/{EMAIL}` substituídos`); gerar resumo via IA; notificar Teams
- `Chat.tsx`: `confidence='low'` → mensagem inline "Não tenho total certeza..." antes da resposta

### 2.5 Front base — Correções
- `ArticleEditor.tsx`: ler `?title=` do `searchParams` no init do form (corrige fluxo lacuna→artigo)
- `routes/index.tsx`: registrar rota `/admin/articles/import`
- Criar `pages/admin/ArticleImport.tsx`: textarea markdown, botão Preview → `POST /preview-import` mostra chunks; Confirm → `POST /import`

**Critério de aceite**: conversa via `/chat` completa com stream, geração de embedding em save de artigo, transferência respeitando horário, lacunas marcadas → criar artigo preenche título.

---

## FASE 3 — Suporte humano + Apoio backoffice (2–3 dias)

### 3.1 Backend
- `TeamsNotificationService` (webhook Microsoft Adaptive Cards) — dispara em: transfer, knowledge_gap criado, out_of_hours, falha crítica
- `SupportTransferService` — decide horário, gera resumo via IA, chama Teams
- `KnowledgeGapController` admin
- `WidgetConversationController` admin, `RatingController`, `AuditLogController` (filtros de período, tipo, usuário), `SystemLogController` (filtros)
- `SettingsController` (AI/Widget/Brand), upload logo/favicon via `Storage::disk('private')` + signed URL

### 3.2 Frontend — completar filtros admin
- `Ratings.tsx`: DatePickerRange + select usuário + canal
- `WidgetConversations.tsx`: DatePickerRange + filtro avaliação
- `AuditLogs.tsx`: DatePickerRange + select action + diff campo-a-campo (não `JSON.stringify`)
- `SystemLogs.tsx`: DatePickerRange + select contexto
- `KnowledgeGaps.tsx`: indicador "notificado no Teams ✓" no card

**Critério**: gestor vê lacunas, marca resolvida → Teams avisou; filtros admin cobrem período/tipo conforme spec.

---

## FASE 4 — Widget embedável (3–4 dias)

### 4.1 Backend rota pública
- `routes/api.php`: grupo `prefix:/widget` sem `auth:sanctum`, com middleware `throttle:30,1` + `CheckWidgetOrigin`
- `POST /api/widget/chat` (stream) com `access_level='public'`, `session_id` gerado no servidor, RLS via role `sabia_widget` + `current_session_id`
- `GET /api/widget/settings` (welcome, horário, manutenção, app_name) — nunca devolve `allowed_domains`/Teams internals
- `GET /api/widget/brand` (cores, logo URL, fonte)
- `POST /api/widget/conversations/:id/close` (rating)

### 4.2 Tela `/widget` pública no app React
- `routes/index.tsx`: `<Route path="/widget" element={<PublicWidget/>} />` fora do `Protected` — recebe `?t=w-...` na query → guarda em store, SSE p/ `/api/widget/chat`
- `pages/widget/PublicWidget.tsx`: estado minimizável, welcome renderizado com MarkdownRenderer, gate manutenção (`maintenance_mode` → mostra `maintenance_message`), botão "falar com humano" fora do horário

### 4.3 Script injectável `sabia-widget.js`
- Novo projeto na mesma workspace: `sabia-widget/` Vite **library mode**, output `dist/sabia-widget.js` (UMD), ~5KB minified
  ```
  sabia-widget/
  ├── package.json
  ├── vite.config.ts (lib mode)
  └── src/index.ts
     - parseia <script data-token="w-..."> mais próximo
     - cria <iframe src=${APP_URL}/widget?t=w-...> estilizado
     - fixed bottom-right, shadow root wrapper p/ evitar colisão CSS
     - postMessage p/ abrir/fechar
  ```
- Laravel serve `sabia-widget.js` via `public/` (ou CDN). URL final: `https://cdn.bsoft.com.br/sabia-widget.js`
- `WidgetDemo.tsx` atualiza `embedCode` p/ URL real; mantém como preview interno

### 4.4 Segurança widget
- Validar `Origin` server-side; payload real vem pelo iframe que envia `Origin` do host
- Token widget com scope único (`abilities:widget`); usado em `/api/*` interno → 403
- CSP do iframe: `frame-src` no host, `frame-ancestors` no `/widget`

**Critério**: página HTML simples em `http://localhost:5500/test-embed.html` com `<script src=... data-token=...></script>` abre widget, conversa flui, backend barrou origem não cadastrada, RLS impede ler artigos `internal`.

---

## FASE 5 — Qualidade front + TipTap markdown seguro (2–3 dias)

### 5.1 TipTap→Markdown robusto
- Substituir `htmlToMarkdown()` regex por **`@tiptap/extension-markdown`** ou **`turndown` + `turndown-plugin-gfm`** (tabelas, tasks, strikethrough)
- Adicionar handler `paste` de imagem no `TipTapEditor` → `handlePaste` lê `event.clipboardData.items`, se `kind=file` e `type.startsWith('image/')` → upload + `Image.configure({allowBase64:false})` + URL signed do Storage
- Remover `allowBase64:true` atual

### 5.2 Busca com highlight
- `KnowledgeBase.tsx`: trocar `.filter().includes` por `GET /search?q=` com debounce 300ms
- Adicionar `<mark>` no título/summary usando retorno `{highlight: '...'}`
- `Topbar.tsx`: redirecionar busca p/ `/kb?q=` consumindo mesmo endpoint

### 5.3 White label real
- Acompanhamento backend de upload logo/favicon (Fase 3.1)
- `brand.ts` `applyBrand`:
  - Injetar/atualizar `<link rel="icon">` no `<head>` com `logo_url`
  - Carregar Google Font dinamicamente via `<link href="https://fonts.googleapis.com/...">` (Inter/Roboto/Open Sans) + setar `--font-sans` em `:root`
- `BrandSettings.tsx`: atualizar preview p/ mostrar fonte aplicada

### 5.4 `Settings Widget` placeholders
- Substituir `{NOME}`, `{EMAIL}` no `support_link` quando renderizados no fluxo de transferência — usar dados do usuário autenticado (`auth.me`)

**Critério**: artigo com tabela salva em markdown válido no banco e reabre idêntico no editor; busca destaca trecho; favicon reflete brand configurado.

---

## FASE 6 — Hardening, pentest prep e doc (2–3 dias)

### 6.1 Testes
- Backend: Pest feature tests p/ fluxos críticos (login+throttle, RLS, IDOR conversa, prompt injection bloqueado, RAG ranking, SSE), unit p/ services
- Frontend: Vitest + React Testing Library nos hooks `useChat`, `useAuth`; Playwright e2e de chat completo e fluxo widget

### 6.2 Pentest prep (seção 9.10)
- Checklist de vetores por área; scripts de teste manual p/ cada policy RLS
- Modo manutenção testado

### 6.3 Observability
- Laravel Telescope (dev) + Sentry/Pulse (prod)
- Log estruturado (`system_logs`) com correlation ID por request

### 6.4 Docs + deploy
- `README.md` do backend: setup, migrations, RLS, seed
- `sabia-frontend/.env.example`: `VITE_API_URL`, `VITE_MSW_ENABLED`
- CI GitHub Actions: lint (oxlint + `./vendor/bin/pint`), typecheck, testes, build
- Docker Compose de prod pronto p/ Railway/VPS

---

## Resumo Visual

| Fase | Duração | Entrega principal |
|---|---|---|
| 0 | 1–2d | Quick wins + scaffold Laravel |
| 1 | 3–4d | Backend núcleo, RLS, auth, segurança |
| 2 | 4–5d | RAG + IA + chat interno + correções front |
| 3 | 2–3d | Teams + lacunas + filtros admin + uploads |
| 4 | 3–4d | Widget embedável via script+iframe |
| 5 | 2–3d | TipTap→MD robusto, highlight, white label real |
| 6 | 2–3d | Testes, pentest prep, observability, deploy |
| **Total** | **~17–24 dias** | Sabiá completo conforme spec v3 |

---

## Observações e Trade-offs

- **RAG/IA é a fase 2** (não a 1) porque precisa das migrations e RLS prontos para testar; providers externos podem ser esboçados em paralelo se houver 2 pessoas.
- **Widget na fase 4** para de braço com frontend (depende de Teams + horário da fase 3).
- **Pentest só na 6**, mas RLS/throttle já dão cobertura mínima; se houver prazo externo, rodar checklist da seção 9.10 ao final de cada fase.
- **Sem Laravel Octane/Swoole** — SSE via `response()->stream()` pura com PHP-FPM é suficiente para o tráfego esperado; escala vira fase futura.
- **Sem cache de embeddings (Redis)** por padrão — adicionar ao fim da fase 2 se custo/latência pedir.
- **MSW em produção**: manter disponível atrás de `VITE_MSW_ENABLED=true` p/ ambientes demo/internos.

---

## Faltas Principais Identificadas (referência)

1. **Backend Laravel inteiro** — migrations/RLS/controllers/services IA/Sanctum/throttle/headers/upload/AES. Bloqueador absoluto.
2. **MSW ativo em produção** (`src/main.tsx:8`) — mascara backend ausente; perigoso p/ deploy.
3. **Widget embedável real** — script UMD, rota pública `/widget`, auth por token, `CheckWidgetOrigin`, gate manutenção.
4. **Importação de Markdown com preview de chunks** — rota `/admin/articles/import` não registrada + `POST /preview-import` não mockado.
5. **Pré-preenchimento `?title=` no ArticleEditor** — fluxo "lacuna → criar artigo" quebrado (`KnowledgeGaps.tsx:53` → `ArticleEditor.tsx`).
6. **Conversão TipTap→Markdown** — regex manual perde tabelas; usar `turndown` ou `@tiptap/extension-markdown`.
7. **Fluxo de Suporte Humano no Chat** — verificar 8h–18h, `window.open(support_link)` com placeholders, resumo no Teams.
8. **Busca híbrida + highlight** — consumir `GET /search` e adicionar `<mark>`.
9. **Sugestão de artigos ao encerrar conversa** (fluxo de encerramento).
10. **White label real** — aplicar favicon no `<head>`, carregar fonte, enviar logo/favicon p/ backend.

### Lacunas menores adicionais
- Filtros de período/data ausentes em Ratings, WidgetConversations, AuditLogs, SystemLogs (spec 7.1/7.2/7.4/7.5).
- Placeholders `{NOME}/{EMAIL}` do `support_link` nunca substituídos.
- Sem `ErrorBoundary`, sem `React.lazy`/`Suspense`, sem code-splitting.
