# Sabiá — Arquitetura

> **Sistema:** Sabiá — Chatbot de Suporte com Base de Conhecimento + IA
> **Stack:** Laravel · React 19 · PostgreSQL 16 + pgvector · FastAPI (sidecar)

Este documento é a referência técnica canônica do sistema (backend, banco, frontend, widget e infraestrutura). Documentos complementares:
[API Reference](api.md) · [Docker](docker.md) · [Manual do Usuário](manual-do-usuario.md)

---

## 1. Visão geral

O Sabiá é um sistema de suporte que combina uma **base de conhecimento (KB)** em markdown com um **chatbot com IA generativa** alimentado por **RAG (Retrieval-Augmented Generation)** sobre a própria KB. Um único backend Laravel atende três superfícies React dentro da mesma SPA, mais um script embedável para sites externos:

| Superfície | Rota | Público | Descrição |
|---|---|---|---|
| Base de Conhecimento | `/kb` | autenticado (gestor/operador) | Navegação de artigos por categoria, busca, feedback |
| Chat interno | `/chat` | autenticado (gestor/operador) | Chat com IA com acesso a artigos `internal`, streaming SSE |
| Gestor (admin) | `/admin/*` | gestor | CRUD de artigos/categorias/usuários, settings, logs, insights |
| Widget público | `/widget` | anônimo | Chat público com acesso somente a artigos `public` |
| Script embedável | `sabia-widget.js` | anônimo | Iframe + botão flutuante para embutir o widget em sites externos |

Diferenciais de arquitetura:

- **RLS (Row Level Security) no PostgreSQL** — isolamento entre contexto interno e widget garantido **no banco**, não apenas em código de aplicação.
- **Provedor de IA plugável compatível com OpenAI** — funciona com OpenAI, Groq, Together, Ollama, vLLM, llama.cpp ou qualquer endpoint `/chat/completions` compatível. Configurável em runtime pelo gestor.
- **Embeddings via sidecar local** (FastAPI + BAAI/bge-m3, 1024 dimensões) com fallback automático para o provedor de chat.
- **Streaming SSE em PHP-FPM puro** (`response()->stream()`) — sem Octane/Swoole nem dependências de conexão de longa duração.

---

## 2. Arquitetura

```
                        ┌─────────────────────────────────────────────┐
                        │                Navegador                    │
                        │  SPA React (sabia-frontend, Vite/nginx)     │
                        │  /kb · /chat · /admin · /widget             │
                        └───────────────┬─────────────────────────────┘
                                        │ HTTP (Bearer Sanctum / X-Session-Id)
                                        ▼
   Site externo ─► sabia-widget.js ─► iframe (rota /widget da SPA)
                                        │
                                        ▼
                        ┌─────────────────────────────────────────────┐
                        │         API Laravel (sabia-api :8000)       │
                        │  Sanctum · CheckRole · SetRlsContext        │
                        │  CheckWidgetOrigin · SecurityHeaders        │
                        │  Rate limiters: login/api/chat/widget/upload│
                        └──────┬──────────────┬───────────────┬───────┘
                               │              │               │
              SET ROLE (RLS)   │              │ HTTP          │ HTTPS (OpenAI-compat)
                               ▼              ▼               ▼
                 ┌───────────────────┐  ┌──────────────┐  ┌──────────────────┐
                 │ PostgreSQL 16     │  │ embedding-   │  │ Provedor de IA   │
                 │ + pgvector (HNSW) │  │ sidecar :8000│  │ (OpenAI/Groq/    │
                 │ roles: internal / │  │ FastAPI      │  │ Ollama/vLLM/     │
                 │ widget / bypass   │  │ bge-m3 1024d │  │ proxy local…)    │
                 └───────────────────┘  └──────────────┘  └──────────────────┘
                               │
                               ▼ (opcional)
                        Microsoft Teams (webhook: transferências, lacunas, fora de horário)
```

### 2.1 Componentes do monorepo

| Pasta | Papel | Tecnologia |
|---|---|---|
| `sabia-api/` | Backend REST + SSE, RAG, RLS, admin | PHP 8.3, Laravel, Sanctum, pgvector-php |
| `sabia-frontend/` | SPA (KB, chat, admin, widget) | React 19, Vite 8, TS, Zustand, Radix/Tailwind, TipTap 3 |
| `sabia-widget/` | Script embedável (botão + iframe) | TS, Vite lib mode (UMD + ES, ~3,6 KB gzip) |
| `embedding-sidecar/` | Serviço de embeddings local | Python 3.11, FastAPI, sentence-transformers (BAAI/bge-m3) |
| `docs/` | Documentação | Markdown |

### 2.2 Ambiente de desenvolvimento (Docker)

`docker-compose.dev.yml` sobe 4 serviços:

| Serviço | Imagem | Porta no host | Observações |
|---|---|---|---|
| `postgres` | `pgvector/pgvector:pg16` | 5432 | DB `sabia`, user/pass `postgres/postgres`, healthcheck `pg_isready` |
| `api` | build `sabia-api/Dockerfile.dev` | 8000 | bind mount do código; `EMBEDDING_URL=http://embedding-sidecar:8000` |
| `web` | build `sabia-frontend/Dockerfile.dev` | 5173 | Vite dev com hot-reload; `VITE_API_URL=http://localhost:8000/api` |
| `embedding-sidecar` | build próprio | 8001 → 8000 | modelo ~1 GB baixado no build |

Produção (`docker-compose.prod.yml`): postgres sem porta exposta, sidecar interno, api em `:8000` (APP_ENV=production), web nginx em `:80/:443` (**TLS não configurado — usar proxy reverso**, ver [docker.md](docker.md)).

---

## 3. Banco de dados

PostgreSQL 16 com extensão **pgvector**. 21+ migrations; entidades principais:

### 3.1 Tabelas

| Tabela | Destaques |
|---|---|
| `users` | PK UUID, `name`, `email` unique, `password` hashed |
| `profiles` | 1:1 com users; `role` ENUM(`operador`,`gestor`), `is_active`, `full_name` |
| `categories` | `name`, `slug`, `color`, `icon`, `sort_order` |
| `articles` | `slug` único, `content` (markdown), `access_level` ENUM(`public`,`internal`), `status` ENUM(`active`,`draft`,`archived`), `version`, contadores, **SoftDeletes** |
| `article_versions` | snapshot de conteúdo por edição (`(article_id, version)` único) |
| `article_chunks` | chunk para RAG; **`embedding VECTOR(1024)`** com índice **HNSW** (`vector_cosine_ops`, m=16, ef_construction=200); `keywords` json |
| `conversations` | PK UUID; `source` ENUM(`direct`,`widget`,`kb`), `access_level`, `session_id`, `rating` smallint CHECK 1–5, `transfer_status` |
| `messages` | `role` ENUM(`user`,`assistant`,`system`), `images`/`sources` json, `confidence` NUMERIC(4,3), `confidence_level` |
| `knowledge_gaps` | perguntas sem resposta suficiente; `resolved`, `teams_notified` |
| `article_suggestions` | fluxo operador→gestor; `status` ENUM(`pending`,`approved`,`rejected`,`published`) |
| `ai_settings` | singleton; provider/endpoint/model/api_key (AES-256), embedding_provider (`sidecar`/`openai`/`gemini`/`custom`), temperature, `max_tokens` (nullable = não enviar), `stream_timeout_seconds` (10–600), `system_prompt`, `chunk_size` (100–4000), `chunk_overlap`, `rag_top_n` (1–20), `confidence_threshold` (0–1), `language` |
| `widget_settings` | singleton; boas-vindas, suporte humano (link com `{NOME}`/`{EMAIL}`, horários, telefone), webhook Teams + flags, `allowed_domains`, `maintenance_mode` |
| `brand_settings` | singleton; nome, logo, favicon, cores, fonte (white label) |
| `audit_logs` | trilha de auditoria (quem/o quê/antes/depois/IP/UA); `user_id` → `users.id` |
| `system_logs` | `level` ENUM(`info`,`warning`,`error`,`critical`), `context`, `payload` json |
| `personal_access_tokens` | tokens Sanctum (`tokenable_id` UUID) |

### 3.2 Row Level Security (RLS)

Três roles de banco criados por migration, trocados em runtime pelo middleware `SetRlsContext` via `SET ROLE`:

| Role | Usado por | Escopo |
|---|---|---|
| `sabia_internal` | operador/gestor sem bypass (e contexto interno) | artigos `active` (todos os níveis), conversas/mensagens **próprias** (`app.current_user_id`) |
| `sabia_widget` | rotas `/widget/*` | artigos `public` + `active`, conversas/mensagens da **própria sessão** (`app.current_session_id`) |
| `sabia_bypass` | gestor | acesso completo (CRUD admin, logs, settings) |

Policies por tabela (resumo):

- `articles` / `article_chunks`: leitura internal (ativos), leitura widget (públicos + ativos, com EXISTS no artigo pai), ALL para bypass.
- `conversations` / `messages`: posse por `user_id` (internal) ou `session_id` (widget), ALL para bypass.
- `knowledge_gaps`: widget insere/lê as da própria sessão; gestor gerencia todas.
- `settings` (ai/widget/brand): leitura para o que cada contexto precisa (widget lê brand/widget settings e o mínimo de ai_settings), escrita só bypass.
- `audit_logs` / `system_logs`: escrita pelo contexto (widget insere em system_logs sem ler), leitura só bypass.

**Contexto por sessão:** `SetRlsContext` executa `SELECT set_config('app.current_user_id', ?, false)` (escopo de **sessão**, não `SET LOCAL`, para sobreviver durante o stream SSE) e `RESET ROLE` no `terminate()` para não vazar contexto elevado em conexões reaproveitadas.

> **Histórico:** a tabela `article_suggestions` nasceu sem policies RLS nem GRANTs (erro 42501 `permission denied`); corrigido pela migration `2026_09_04_150000_grant_rls_article_suggestions_table` (ENABLE RLS + grants + policies).

---

## 4. Backend (`sabia-api`)

### 4.1 Camadas

- **Controllers** — finos; validação via `$request->validate()` com mensagens em pt-BR; auditoria via `AuditService::record()` nas mutações relevantes.
- **Models** (15) — Eloquent; singletons de settings (`AiSettings::current()`, `WidgetSettings::current()`, `BrandSettings::current()`) cacheados 5 min (`ai_settings.current` etc.).
- **Middleware** (aliases em `bootstrap/app.php`):
  - `role:gestor,operador` (`CheckRole`) — 403 “Permissão insuficiente.”
  - `rls[:widget]` (`SetRlsContext`) — contexto + `SET ROLE` (ver §3.2)
  - `widget.origin` (`CheckWidgetOrigin`) — valida `Origin`/`Referer` contra `widget_settings.allowed_domains` (vazio = libera; aceita subdomínios `*.dominio`)
  - `SecurityHeaders` (global) — HSTS, CSP, X-Frame-Options DENY (SAMEORIGIN + `frame-ancestors` dinâmico nas rotas widget), nosniff, Referrer-Policy, Permissions-Policy; payload máx. 10 MB
  - `access` (`CheckAccessLevel`) — token `widget` não acessa escopo `internal`
- **Rate limiters** (registrados em `AppServiceProvider`):

| Limiter | Limite | Aplicado a |
|---|---|---|
| `login` | 5 / 15 min por IP **e** por e-mail | `POST /auth/login` |
| `api` | 200 / min por user/IP | grupo autenticado |
| `chat` | 100 / min | `POST /chat` |
| `widget-chat` | 30 / min por IP | `POST /widget/chat` |
| `upload` | 20 / min | upload de imagem |

### 4.2 Serviços (`app/Services`)

| Service | Responsabilidade | Pontos-chave |
|---|---|---|
| `AIProvider` | Cliente único do provedor de IA (contrato OpenAI-compat) | `chat()` streaming via generator (`data:` SSE, `[DONE]`); multimodal (`analyzeImages`); `embed()` (sidecar → fallback `/embeddings` do provedor); `summarize()`; fallbacks amigáveis quando o provedor responde vazio; timeout 120 s |
| `EmbeddingService` | Cliente do sidecar (bge-m3) | `embed`, `embedBatch` (≤64 itens/32k chars), `isAvailable`; **circuit breaker** em cache (60 s) após falha de conexão; **contrato: nunca lança — retorna `[]`** |
| `ArticleChunkService` | Chunking + embeddings no save/revert do artigo | split por parágrafos com overlap; fallback por fim de frase; keywords (top 10, stop words pt-BR); batch no sidecar com fallback per-chunk |
| `VectorSearchService` | Busca vetorial pgvector nativa | `1 - (embedding <=> ?::vector)` como similaridade; filtro `access_level`; `estimateConfidence`: top ≥ threshold → `high`; ≥ 0,6×threshold → `low`; senão `none`; `formatContext` monta blocos `[relevância: X]` |
| `PromptInjectionDetector` | 8 regexes (case-insensitive) | “ignore previous instructions”, `system:`, “you are now”, “act as”, “forget everything”, “new instructions:”, `[INST]`, `<|system|>` |
| `SupportTransferService` | Transferência para humano | ordem: manutenção → fora de horário (faixas overnight OK) → resumo best-effort (sem IA) → fecha conversa → monta link com placeholders → notifica Teams |
| `Teams\TeamsNotificationService` | Webhook Office 365 Connector | cartões MessageCard; falha nunca interrompe o fluxo principal |
| `AuditService` / `SystemLogService` | Trilhas de auditoria e log técnico | degradam graciosamente (nunca lançam) |

### 4.3 Fluxo de chat com RAG (POST `/chat` e `/widget/chat`)

1. **Validação**: `message` (≤10 000 chars), `conversation_id` (UUID opcional), `images` (≤5, para o chat interno).
2. **Prompt injection** → 400 “Mensagem bloqueada por segurança.” + warning em `system_logs`.
3. **Conversa**: busca/cria (`direct`/`internal` no chat; `widget`/`public` no widget). Posse validada por IDOR (user) ou `hash_equals` do `session_id` (widget).
4. **RAG**: `embed(message)` (vazio → 503) → `VectorSearchService::search` (top `rag_top_n`, filtro de nível) → `formatContext` → `estimateConfidence`.
5. **System prompt**: prompt configurável + bloco delimitado `=== CONTEXTO === … === FIM DO CONTEXTO ===` + histórico das últimas 20 mensagens.
6. **Stream SSE**: evento inicial `{"conversation_id": …}` → `data: {"text": chunk}` por delta → `data: [DONE]`. Headers: `text/event-stream`, `no-cache`, `X-Accel-Buffering: no`.
7. **Pós-stream**: salva `Message` assistant com `confidence`/`confidence_level`; confiança `none` cria **KnowledgeGap** (non-blocking).

O widget adicionalmente respeita `maintenance_mode` (503 com mensagem) e horário de atendimento (usado na transferência).

### 4.4 Autenticação

- **SPA interna**: Sanctum com Bearer token gerado no login (abilities `gestor`/`operador`). Hash dummy quando o e-mail não existe (anti timing-attack); usuário inativo recebe a mesma mensagem genérica.
- **Widget**: sem Sanctum; credencial de posse é o `session_id` (UUID gerado no cliente via CSPRNG), enviado no body/header `X-Session-Id` e validado com `hash_equals`.
- `GET /chat/config` expõe `stream_timeout_seconds` para o frontend ajustar o timeout do stream.

### 4.5 Comandos artisan

| Comando | Função |
|---|---|
| `php artisan chunks:reembed` | Regenera embeddings de todos os artigos com chunks (**obrigatório** após migrar 768→1024 ou trocar modelo de embedding) |
| `composer dev` | `artisan serve` + queue + pail + vite (concurrently) |
| `composer test` | `config:clear` + `php artisan test` |

### 4.6 Testes automatizados (backend)

- Banco de teste: **PostgreSQL real** (`sabia_test`) — os testes exercitam as policies RLS verdadeiras (não usam sqlite).
- `tests/bootstrap.php` isola o ambiente: desativa config cacheada, força `APP_ENV=testing`/`DB_DATABASE=sabia_test` (PHPUnit 12 não força mais `<env>`).
- Suítes Feature: `AuthTest`, `AuditTest`, `EmbeddingServiceTest`, `PromptInjectionTest`, `RLSTest`, `RagTest`, `SseTest` — 40 testes / 98 asserções.

> ⚠️ Executar `php artisan test` **dentro do container** (ou com `.env.testing` apontando ao Postgres correto). Na máquina host, com as credenciais erradas, os testes falham por conexão (`SQLSTATE[08006]`).

### 4.7 Limitação operacional importante

`php artisan serve` (usado no container dev) é o **servidor embutido do PHP com um único worker**: enquanto um stream SSE aguarda um provedor de IA lento/travado, **todas as outras requisições ficam enfileiradas**. Em produção, usar PHP-FPM com `pm.max_children` adequado — o streaming ocupa 1 worker por chat ativo; dimensionar para a concorrência esperada e garantir timeout do provedor (`stream_timeout_seconds` + timeout do `AIProvider`).

---

## 5. Frontend (`sabia-frontend`)

### 5.1 Stack e organização

- React 19 + Vite 8 + TypeScript; react-router-dom 7 com `React.lazy()` + `Suspense` + `ErrorBoundary` (code splitting).
- **UI**: Radix/shadcn + Tailwind; TipTap 3 no editor de artigos.
- **Zustand** com persistência em localStorage; **MSW** disponível para dev sem backend.

```
src/
├── components/
│   ├── ui/           # Primitivos Radix (Button, Input, Dialog, Table, Tabs…)
│   ├── common/       # MarkdownRenderer, StarRating, ConfidenceBadge, PageHeader…
│   ├── editor/       # TipTapEditor
│   └── layout/       # AppShell, Sidebar, Topbar
├── hooks/            # useChat, useAuth…
├── lib/              # api.ts (cliente HTTP), utils.ts
├── mocks/            # MSW: handlers.ts (~50 endpoints), db.ts, browser.ts
├── pages/
│   ├── chat/         # Chat.tsx
│   ├── kb/           # KnowledgeBase, ArticleView
│   ├── admin/        # CRUDs, insights e settings
│   └── widget/       # PublicWidget, WidgetDemo
├── routes/index.tsx  # Router + guardas por role
├── stores/           # auth, brand, theme, toast (Zustand)
└── types/index.ts
```

### 5.2 Stores (Zustand)

| Store | Chave localStorage | Conteúdo |
|---|---|---|
| `useAuthStore` | `sabia-auth` | `user`, `token`, `setSession()`, `clear()` |
| `useBrandStore` | `sabia-brand` | `brand` + `applyBrand()` — injeta CSS vars, favicon e fonte (white label) |
| `useThemeStore` | `sabia-theme` | claro/escuro (segue o SO por padrão) |
| `useToastStore` | — | `success/error/warning/info/dismiss` |

### 5.3 Cliente HTTP e `useChat`

- **`lib/api.ts`**: cliente HTTP com `Authorization: Bearer` da auth store; `ApiError` (status + body); `raw()` para SSE/FormData. `useApiError` padroniza 401 (logout), 403, 404, 422, 429.
- **`hooks/useChat.ts`** — `useChat({ endpoint, initialConversationId, initialMessages })`:
  - consome o stream SSE (leitor de `res.body`; eventos `conversation_id`/`text`/`message`/`[DONE]`);
  - **timeout total único** (padrão 180 s, obtido de `GET /chat/config` → `stream_timeout_seconds`), preservando o texto parcial e injetando mensagem de timeout;
  - sem retry automático; erros HTTP expõem a mensagem amigável do backend (`body.message`);
  - callbacks: `onMessageStart`, `onChunk`, `onMessageEnd`, `onError`, `onTimeout`.
- **Histórico de conversas** (`Chat.tsx`): painel lateral lista as conversas do usuário (`GET /conversations`, filtro `source=direct`) com título, data, status (Aberta/Encerrada) e avaliação; clicar carrega as mensagens (`GET /conversations/{id}/messages`) e restaura o `conversation_id`, permitindo continuar a conversa.
- **MSW**: ativo só em dev e quando `VITE_MSW_ENABLED !== 'false'` (padrão); produção nunca. Para rodar contra a API real, defina `VITE_MSW_ENABLED=false` no `.env`.

### 5.4 Rotas

| Rota | Componente | Acesso |
|---|---|---|
| `/login` | `Login` | público |
| `/kb`, `/kb/:slug` | `KnowledgeBase`, `ArticleView` | autenticado |
| `/chat` | `Chat` | autenticado |
| `/article-suggestions*` | `ArticleSuggestions`, `ArticleSuggestionEditor` | autenticado (cada um vê as próprias) |
| `/admin/article-suggestions/:id` | `ArticleSuggestionReview` | gestor (aprovar / aprovar com edição / rejeitar) |
| `/admin/*` (artigos, categorias, usuários, ratings, widget-conversations, knowledge-gaps, audit-logs, system-logs, health, `settings/{ai,widget,brand}`) | vários | gestor |
| `/widget` | `PublicWidget` | público — rota de topo standalone, alvo do iframe do embed |
| `/widget-demo` | `WidgetDemo` | autenticado (preview do embed) |
| `*` | 404 | público |

O menu lateral oculta os grupos Administração/Insights/Configurações para operador; o route guard `Protected role="gestor"` bloqueia acesso direto por URL (redireciona para `/`).

### 5.5 Componentes-chave

- **`TipTapEditor`** — editor de artigos com saída markdown: Turndown+GFM (HTML→MD) e `marked`+`DOMPurify` (MD→HTML); menu “/” (títulos, listas, checklist, código, citação, tabela, imagem, divisor e inserção de link para outro artigo via picker da KB); upload/colagem/arraste de imagem (`POST /admin/articles/upload-image`, nunca base64).
- **`MarkdownRenderer`** — `marked` + `DOMPurify` + `highlight.js`; config sincronizada com o editor (`breaks: true, gfm: true`).
- **`Chat`** — composer com auto-resize, drag&drop/colar imagem, contador de caracteres; mensagens com markdown, selo de confiança, fontes, 👍/👎, copiar, regenerar; rating 1–5 ao encerrar; exportar TXT.
- **`PublicWidget`** — página standalone do iframe: token via query `?t=`, brand dinâmica (`/widget/settings` + `/widget/brand`), boas-vindas configurável, transferência para humano, modo manutenção.

### 5.6 Tipos principais (`types/index.ts`)

```typescript
interface Profile {
  id: string; user_id: string; full_name: string
  role: 'gestor' | 'operador'; is_active: boolean
}

interface Article {
  id: number; title: string; slug: string; content: string  // markdown
  summary?: string; category_id: number
  access_level: 'public' | 'internal'
  status: 'active' | 'draft' | 'archived'
  views_count: number; helpful_yes: number; helpful_no: number
  version: number; created_by: string
}

interface Conversation {
  id: string; user_id?: string; session_id?: string
  source: 'direct' | 'widget' | 'kb'
  access_level: 'public' | 'internal'
  title?: string; is_closed: boolean; rating?: number
  transfer_status?: 'transferred' | 'out_of_hours' | 'no_answer'
}

interface Message {
  id: number; conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string; images?: string[]; sources?: Source[]
  has_images: boolean
  confidence?: number; confidence_level?: 'high' | 'low' | 'none'
}
```

`AiSettings` inclui `EmbeddingProvider` (`sidecar | openai | gemini | custom`), os campos `embedding_model`/`embedding_endpoint`/`embedding_api_key`, `stream_timeout_seconds`; `max_tokens` pode ser `null`. A tela `AISettings.tsx` tem 3 abas (Conexão / System Prompt / RAG & Confiança), indicador de saúde do sidecar, **Testar embedding** e **Testar prompt ao vivo** (SSE).

### 5.7 Dependências notáveis

| Pacote | Uso |
|---|---|
| `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-*` | Editor rich text |
| `turndown`, `turndown-plugin-gfm` | HTML → Markdown |
| `marked`, `dompurify`, `highlight.js` | Markdown → HTML sanitizado |
| `zustand` | State management |
| `@radix-ui/*` | UI primitives (Dialog, Dropdown, Tabs, etc.) |
| `react-router-dom` | Routing |
| `lucide-react` | Ícones |
| `date-fns` | Formatação de datas |
| `msw` | Mock API (dev) |

### 5.8 Testes do frontend

- **Vitest** (`npm run test`): jsdom + RTL; 4 testes da auth store — passando.
- **Playwright** (`npx playwright test`): specs em `tests/e2e/{auth,chat}.spec.ts` — **desatualizados** (usam usuário inexistente no seed e `data-testid` que não existe no componente).
- **Lint**: oxlint (0 erros). **Typecheck**: `tsc --noEmit` limpo; `npm run build` OK (aviso de chunks >500 kB em MarkdownRenderer/TipTap).

---

## 6. Embedding sidecar

FastAPI que serve **BAAI/bge-m3** (1024 dimensões, embeddings normalizados) via sentence-transformers.

| Endpoint | Body | Resposta |
|---|---|---|
| `GET /health` | — | `{"ok": true}` |
| `POST /embed` | `{"text"}` ≤32k chars | `{"vector":[...], "dimensions":1024}` |
| `POST /embed/batch` | `{"texts":[...]}` ≤64 itens | `{"vectors":[[...]]}` |

- Auth opcional: env `EMBEDDING_SIDECAR_TOKEN` (Bearer).
- Laravel aponta via `EMBEDDING_URL` (`config/services.php` → `embedding.url`); `ai_settings.embedding_provider=sidecar` seleciona o dispatch.
- Falha do sidecar → `AIProvider::embed()` faz fallback para o endpoint `/embeddings` do provedor de chat; `EmbeddingService` marca queda por 60 s (circuit breaker).
- Após trocar modelo/dimensão: `php artisan chunks:reembed` (a migration `2026_09_01_010000` migrou 768→1024 com recriação do índice HNSW).

---

## 7. Widget embedável (`sabia-widget`)

- Script UMD/ES (~3,6 KB gzip) que auto-inicializa, cria um **Shadow DOM fechado** com botão flutuante (56×56) e um **iframe** 380×560 apontando para `${apiUrl}/widget?t={token}`.
- API pública: `window.SabiáWidget.{open, close, toggle, isOpen}` (com acento, exatamente assim); comunicação iframe↔script via `postMessage` (`sabia:widget:open|close`).
- Config por data-attributes na tag `<script>`: `data-token` (obrigatório), `data-api-url`, `data-position` (`bottom-right` default), `data-primary-color`.

```html
<script src="https://seu-host/sabia-widget.umd.js"
        data-token="w-xxx"
        data-api-url="https://api.seudominio.com"
        data-position="bottom-right"
        data-primary-color="#6366f1"></script>
```

---

## 8. Segurança (checklist)

- ✅ RLS no PostgreSQL por contexto (internal/widget/bypass) com policies testadas (RLSTest).
- ✅ Sanctum + abilities; senha com hash; anti-enumeration no login; rate limit por IP+e-mail.
- ✅ Segurança de headers (HSTS, CSP com `frame-ancestors` dinâmico, nosniff, DENY em frame).
- ✅ CORS restrito (`ALLOWED_ORIGINS`) e `allowed_domains` por widget.
- ✅ API keys criptografadas em repouso (AES-256, cast `Encryptable`) e **mascaradas** na API/auditoria.
- ✅ Detector de prompt injection (8 padrões) testado por suíte.
- ✅ Upload de imagem: MIME revalidado server-side, máx. 4 MB.
- ⚠️ Produção nginx sem TLS configurado (usar proxy reverso) — [docker.md](docker.md).
- ⚠️ `X-Frame-Options`/CSP do widget dependem de `allowed_domains` bem preenchidos.

---

## 9. Limitações e pontos de atenção conhecidos

1. **Artigos antigos sem chunks** (criados antes do sidecar/migração 1024): rodar `php artisan chunks:reembed` para dar cobertura RAG ao seed.
2. **Testes Playwright desatualizados** (usuário inexistente no seed, `data-testid` ausente).
3. **Feeds de dados duplicados em dev**: o StrictMode do React duplica effects (2× GET em listagens, views +2 por visita) — só afeta `npm run dev`, não o build de produção.
4. **Fuso horário do servidor**: `Carbon::now()` roda em UTC no container — o horário de atendimento do widget (08:00–18:00) é comparado contra o relógio do servidor. Em produção, definir `APP_TIMEZONE=America/Sao_Paulo` (ou o fuso do negócio) no `.env`.
5. **`php artisan serve` tem um único worker** (ver §4.7) — em produção usar PHP-FPM dimensionado para a concorrência de streams.

---

## 10. Referência rápida de comandos

```bash
# Subir o ambiente completo (dev)
docker compose -f docker-compose.dev.yml up -d

# Backend (dentro do container)
docker exec sabia_api_dev php artisan test          # suíte completa (40 testes)
docker exec sabia_api_dev php artisan chunks:reembed
docker exec sabia_api_dev ./vendor/bin/pint         # code style

# Frontend (host, pasta sabia-frontend)
npm run dev        # Vite :5173
npm run test       # Vitest
npm run lint       # oxlint
npx tsc --noEmit   # typecheck
npm run build      # produção

# Widget
cd sabia-widget && npm run build   # dist/sabia-widget.umd.js

# Saúde
curl http://localhost:8000/api/health   # API
curl http://localhost:8001/health       # sidecar (host)
```
