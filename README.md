# Sabiá — Chatbot de Suporte com Base de Conhecimento + IA

> **Stack:** Laravel · React 19 · PostgreSQL + pgvector · FastAPI (sidecar de embeddings)

Sistema completo de suporte com 3 interfaces compartilhando o mesmo backend:
- **`/kb`** — Base de Conhecimento (browse artigos por categoria, busca)
- **`/chat`** — Chat interno (IA com acesso a artigos `internal`)
- **`/widget`** — Widget embedável público (iframe + script UMD)

Destaques de arquitetura: **RLS no PostgreSQL** (isolamento interno/widget no banco), **provedor de IA plugável compatível com OpenAI** (OpenAI, Groq, Ollama, vLLM…), **RAG com pgvector** (HNSW, embeddings locais via sidecar bge-m3) e **streaming SSE em PHP-FPM puro**.

---

## 🚀 Quick Start

### Pré-requisitos
- PHP 8.3+ / Composer
- Node.js 22+ / npm 10+
- PostgreSQL 15+ com extensão `pgvector` (ou use o Docker abaixo)
- Conta em provedor IA (Gemini, OpenAI ou Anthropic) — ou um endpoint local compatível

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

Credenciais do seed: `gestor@sabia.com` / `password123`.

### 3. Widget Embed (Script UMD)
```bash
cd sabia-widget
npm install
npm run build
# Output: dist/sabia-widget.umd.js (~3.6KB gzipped)
# Copie para sabia-api/public/sabia-widget.js ou CDN
```

### 4. Docker (alternativa aos passos 1–2)
```bash
docker compose -f docker-compose.dev.yml up        # dev, hot-reload
```

Instruções de produção, sidecar de embeddings e troubleshooting: [docs/docker.md](docs/docker.md).

---

## 📁 Estrutura do Monorepo

```
sabia/
├── sabia-api/           # Backend Laravel (REST + SSE, RAG, RLS, admin)
├── sabia-frontend/      # SPA React (KB, chat, admin, widget)
├── sabia-widget/        # Script embedável (Vite lib mode, UMD + ES)
├── embedding-sidecar/   # Serviço de embeddings local (FastAPI + bge-m3)
├── docker-compose.dev.yml / docker-compose.prod.yml
└── docs/                # Documentação
```

---

## ⚙️ Configuração

### Backend `.env` (sabia-api)
```env
APP_NAME=Sabiá
APP_ENV=local
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

# IA (configurável também em runtime via Admin → Settings → IA)
# AI_PROVIDER=openai
# AI_ENDPOINT=https://api.openai.com/v1
# AI_API_KEY=sk-...
# AI_MODEL=gpt-4o
# AI_EMBEDDING_MODEL=text-embedding-3-small
# EMBEDDING_URL=http://embedding-sidecar:8000
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
- **Security Headers:** HSTS, CSP, X-Frame-Options, nosniff
- **CORS** restrito via `ALLOWED_ORIGINS`; `allowed_domains` por widget
- **Prompt Injection Detection** (8 regex patterns)
- **API Key criptografada** AES-256 (Encryptable cast)
- **Upload imagens:** validação MIME server-side, max 4MB

---

## 🧪 Testes

```bash
# Backend (Pest) — usa Postgres real para exercitar as policies RLS
cd sabia-api && php artisan test

# Frontend (Vitest + React Testing Library)
cd sabia-frontend && npm run test

# Widget
cd sabia-widget && npm run build
```

---

## 📚 Documentação

- [Arquitetura](docs/arquitetura.md) — Backend, banco/RLS, frontend, widget, sidecar e segurança em um só lugar
- [API Reference](docs/api.md) — Todos endpoints, auth, rate limits, códigos de erro
- [Manual do Usuário](docs/manual-do-usuario.md) — Guia por perfil + embed do widget
- [Docker](docs/docker.md) — Dev, produção e sidecar de embeddings
- [Contribuindo](CONTRIBUTING.md) — Padrões de código, commits e checklist de PR

---

## 📄 Licença

[Distribuído sob licença MIT](LICENSE).
