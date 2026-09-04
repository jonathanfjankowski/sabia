# Sabiá — Chatbot de Suporte com Base de Conhecimento + IA

> **Stack:** Laravel 13.8 + React 19 + PostgreSQL + pgvector
> **Versão:** v3.0 (spec `sabia_spec_v3.md`)

Sistema completo de suporte com 3 interfaces compartilhando o mesmo backend:
- **`/kb`** — Base de Conhecimento (browse artigos por categoria, busca)
- **`/chat`** — Chat interno (IA com acesso a artigos `internal`)
- **`/widget`** — Widget embedável público (iframe + script UMD)

---

## 🚀 Quick Start

### Pré-requisitos
- PHP 8.3+
- Composer 2.10+
- Node.js 22+ / npm 10+
- PostgreSQL 15+ com extensão `pgvector`
- Conta em provedor IA (Gemini, OpenAI ou Anthropic)

### 1. Backend (Laravel)
```bash
cd sabia-api
composer install
cp .env.example .env
# Edite .env com DB_DATABASE, DB_PASSWORD, ALLOWED_ORIGINS, etc.
php artisan key:generate
php artisan migrate --seed
php artisan serve  # :8000
```

### 2. Frontend (React + Vite)
```bash
cd sabia-frontend
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:8000/api
npm run dev  # :5173
```

### 3. Widget Embed (Script UMD)
```bash
cd sabia-widget
npm install
npm run build
# Output: dist/sabia-widget.umd.js (~3.6KB gzipped)
# Copie para sabia-api/public/sabia-widget.js ou CDN
```

### 4. Docker (alternativa ao passo 1–2)
```bash
# Dev (hot-reload, bind mounts)
docker compose -f docker-compose.dev.yml up

# Produção
echo "DB_PASSWORD=suasenha" > .env
# editar docker-compose.prod.yml (APP_URL, SANCTUM_STATEFUL_DOMAINS, VITE_API_URL)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api php artisan migrate
```

Detalhes em [DOCKER.md](DOCKER.md).

---

## 📁 Estrutura do Monorepo

```
sabia/
├── sabia-api/              # Backend Laravel
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── Auth/           # AuthController (login/logout/me)
│   │   │   ├── Admin/          # User, Settings, AuditLog, SystemLog, Rating, WidgetConversation, KnowledgeGap, Health
│   │   │   ├── ArticleController
│   │   │   ├── CategoryController
│   │   │   ├── ChatController
│   │   │   ├── ConversationController
│   │   │   ├── KnowledgeGapController
│   │   │   ├── PublicWidgetController  # Widget público (SSE + RAG)
│   │   ├── Services/
│   │   │   ├── AIProvider.php            # OpenAI-compatible streaming
│   │   │   ├── ArticleChunkService.php   # Chunking + embedding on save
│   │   │   ├── VectorSearchService.php   # pgvector cosine search
│   │   │   ├── PromptInjectionDetector.php
│   │   │   ├── SupportTransferService.php
│   │   │   ├── TeamsNotificationService.php
│   │   │   ├── AuditService.php
│   │   │   └── SystemLogService.php
│   │   ├── Models/                 # 13 models (Profile, Article, Conversation, etc.)
│   │   ├── Middleware/             # CheckRole, SetRlsContext, CheckWidgetOrigin, SecurityHeaders
│   │   └── Casts/Encryptable.php   # AES-256 para api_key
│   ├── database/migrations/        # 17 migrations + RLS
│   ├── routes/api.php              # Todas as rotas
│   └── config/
│       ├── security.php            # Headers (HSTS, CSP, X-Frame-Options)
│       └── cors.php                # CORS via ALLOWED_ORIGINS
│
├── sabia-frontend/               # Frontend React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # Radix primitives
│   │   │   ├── common/            # MarkdownRenderer, StarRating, ConfidenceBadge, etc.
│   │   │   ├── editor/            # TipTapEditor (rich text, slash commands)
│   │   │   └── layout/            # AppShell, Sidebar, Topbar
│   │   ├── pages/
│   │   │   ├── chat/Chat.tsx
│   │   │   ├── kb/KnowledgeBase.tsx, ArticleView.tsx
│   │   │   ├── admin/             # 17 páginas admin
│   │   │   └── widget/PublicWidget.tsx, WidgetDemo.tsx
│   │   ├── routes/index.tsx       # Lazy routes + ErrorBoundary
│   │   ├── stores/                # Zustand: auth, brand, theme, toast
│   │   ├── hooks/useChat.ts       # SSE streaming + timeout + retry
│   │   ├── lib/api.ts             # HTTP client + ApiError
│   │   ├── mocks/                 # MSW handlers + db (dev only)
│   │   └── types/index.ts
│   ├── package.json
│   └── vite.config.ts
│
├── sabia-widget/                 # Script embedável (Vite lib mode)
│   ├── src/index.ts              # Shadow DOM + iframe + postMessage
│   ├── dist/sabia-widget.umd.js  # ~3.6KB gzipped
│   └── vite.config.ts
│
└── docs/
    ├── api.md                    # Documentação completa da API
    └── frontend.md               # Documentação frontend
```

---

## ⚙️ Configuração

### Backend `.env` (sabia-api)
```env
APP_NAME=Sabiá
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=sabia
DB_USERNAME=postgres
DB_PASSWORD=secret

# Sanctum SPA
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000
SESSION_DOMAIN=localhost

# CORS + Security
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
SECURITY_HEADERS_ENABLED=true

# IA (configurável via Admin → Settings → IA)
# AI_PROVIDER=openai
# AI_ENDPOINT=https://api.openai.com/v1
# AI_API_KEY=sk-...
# AI_MODEL=gpt-4o
# AI_EMBEDDING_MODEL=text-embedding-3-small
```

### Frontend `.env` (sabia-frontend)
```env
VITE_API_URL=http://localhost:8000/api
VITE_MSW_ENABLED=true
```

---

## 🔐 Segurança

- **RLS (Row Level Security)** no PostgreSQL: roles `sabia_internal`, `sabia_widget`, `sabia_bypass`
- **Sanctum SPA cookie auth** + tokens com abilities (`gestor`, `operador`, `widget`)
- **Rate limiting:** login 5/15min, chat 100/min, widget 30/min, upload 20/min
- **Security Headers:** HSTS, CSP, X-Frame-Options DENY (SAMEORIGIN em /widget), nosniff
- **CORS** restrito via `ALLOWED_ORIGINS`
- **Prompt Injection Detection** (8 regex patterns)
- **API Key criptografada** AES-256 (Encryptable cast)
- **Payload limit:** 10MB
- **Upload imagens:** validação MIME server-side, max 4MB, 5 por mensagem, armazenamento `public/articles/`

---

## 🤖 IA & RAG

- **Provider:** OpenAI-compatible (funciona com OpenAI, Groq, Ollama, vLLM, Gemini via endpoint OpenAI)
- **Streaming:** SSE via `response()->stream()` (PHP-FPM, sem Octane/Swoole)
- **RAG:** pgvector HNSW index (cosine similarity), top-N configurável
- **Chunking:** `chunk_size`/`chunk_overlap` de `ai_settings`, divisão por parágrafos + fallback caracteres
- **Embeddings:** gerados no save do artigo via `ArticleChunkService`
- **Confiança:** high (≥ threshold), low (≥ 0.6×threshold), none (< 0.6×threshold) → knowledge gap
- **System Prompt:** delimitadores `=== CONTEXTO ===` / `=== FIM DO CONTEXTO ===` (isolamento do input)

---

## 🧪 Testes

```bash
# Backend (Pest)
cd sabia-api
php artisan test

# Frontend (Vitest + React Testing Library)
cd sabia-frontend
npm run test

# E2E (Playwright)
cd sabia-frontend
npx playwright test
```

---

## 📦 Deploy

### Docker Compose (Produção)
```yaml
# docker-compose.prod.yml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: sabia
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: ./sabia-api
    environment:
      - APP_ENV=production
      - DB_HOST=postgres
    depends_on: [postgres]

  web:
    build: ./sabia-frontend
    environment:
      - VITE_API_URL=https://api.seudominio.com/api
    ports:
      - "80:80"
```

### Variáveis de Produção
- `APP_ENV=production`
- `APP_DEBUG=false`
- `SECURITY_HEADERS_ENABLED=true`
- `ALLOWED_ORIGINS=https://seudominio.com`
- `SANCTUM_STATEFUL_DOMAINS=seudominio.com`

---

## 📚 Documentação

- [Documentação Técnica](docs/TECNICA.md) — Arquitetura, banco/RLS, serviços, fluxos, segurança, limitações conhecidas
- [API Reference](docs/api.md) — Todos endpoints, auth, rate limits, códigos de erro
- [Frontend Architecture](docs/frontend.md) — Componentes, stores, hooks, fluxos, tipos
- [Manual do Usuário](docs/MANUAL_DO_USUARIO.md) — Guia por perfil (gestor, operador, visitante do widget) + embed do widget
- [Relatório de Testes E2E](docs/RELATORIO_TESTES_E2E.md) — Resultados das suítes, testes GUI e bugs encontrados
- [Embedding Sidecar](docs/EMBEDDING_SIDECAR.md) — Serviço local de embeddings (bge-m3)

---

## 🛠️ Comandos Úteis

```bash
# Backend
cd sabia-api
php artisan migrate:fresh --seed
php artisan test --filter=ChatTest
./vendor/bin/pint          # Code style

# Frontend
cd sabia-frontend
npm run build              # tsc + vite build
npm run lint               # oxlint
npm run preview            # Serve dist/

# Widget
cd sabia-widget
npm run build              # dist/sabia-widget.umd.js
```

---

## 📄 Licença

Proprietário — Bsoft Sistemas.