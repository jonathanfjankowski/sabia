# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

Todo código, comentários, mensagens de commit, nomes de variáveis/classes quando em PT-BR, e comunicação com o usuário devem ser em **português brasileiro**. Termos técnicos consagrados (`middleware`, `controller`, `endpoint`, `payload`, `stream`, `chunk`, etc.) e identificadores de bibliotecas/módulos permanecem no original em inglês.

## Commands

```bash
# Backend (sabia-api) — Laravel 13.8 + Sanctum + pgvector
cd sabia-api
composer install
composer dev              # artisan serve + queue + pail + vite (concurrently)
php artisan serve         # Laravel only (:8000)
php artisan migrate       # run migrations (Postgres + pgvector required)
php artisan test          # PHPUnit 12 (--filter=Name to run a single test)
./vendor/bin/pint         # Laravel code style fixer

# Frontend (sabia-frontend) — React 19 + Vite 8 SPA
cd sabia-frontend
npm install
npm run dev               # vite :5173
npm run build             # tsc -b && vite build → dist/
npm run lint              # oxlint
npm run preview           # serve dist/ locally
```

## Architecture

One Laravel backend serves three React surfaces, all from the same SPA (route-gated, not separate apps):

- **`/kb`** — public Knowledge Base (browse articles by category, search)
- **`/chat`** — internal chatbot (SSE streaming, `access_level`: `public` + `internal`)
- **`/admin`** — Gestor dashboard: CRUD articles/categories/users, RAG settings, brand/AI config, logs, ratings, widget conversations
- **`/widget`** — embeddable public chat (`/widget` is the public route within the SPA; `sabia-widget.js` is the standalone embed script — see spec §9)

### Backend (`sabia-api/`)

Laravel 13.8 + Sanctum (SPA cookie auth) + PostgreSQL + pgvector + RLS. Already scaffolded — controllers, middleware, services, models, and migrations exist (14 models, 21 migrations, full `routes/api.php`).

Key pieces:

- **Auth**: `AuthController` (login/logout/me). Sanctum SPA — CSRF at `/sanctum/csrf-cookie`, then `POST /login`. Widget uses scoped tokens (`abilities:widget`).
- **Middleware aliases** (`app/Http/Kernel.php`): `role` (gestor/operador), `rls` (sets `app.current_user_id` / `app.current_session_id` per-request), `widget.origin` (validates `Origin` vs `widget_settings.allowed_domains`), `SecurityHeaders` (HSTS, CSP, X-Frame-Options DENY, etc.).
- **RLS**: PostgreSQL row-level security with roles `sabia_internal` and `sabia_widget`. Widget users never see `internal` articles — enforced at DB level, not app logic. `SetRlsContext` middleware sets the session vars inside a transaction.
- **Services** (`app/Services/`): `AIProvider`, `AuditService`, `SystemLogService`, `PromptInjectionDetector` (regex per spec §5.5), `SupportTransferService`, `Teams/TeamsNotificationService`.
- **Settings singletons**: `ai_settings` (provider, model, api_key AES-encrypted via `Encryptable` cast), `widget_settings`, `brand_settings`. All editable at runtime from `/admin/settings/*`.
- **Article chunks**: `article_chunks.embedding VECTOR(768)` + HNSW index for cosine similarity search (`pgvector/pgvector`).
- **Routes layout** (`routes/api.php`):
  - public: `/health`, `/auth/login`, `/widget/*` (no sanctum, `rls:widget` + `widget.origin`)
  - `auth:sanctum` → `rls` → split by `role:gestor,operador` vs `role:gestor` (admin CRUD, logs, settings)

### Frontend (`sabia-frontend/`)

React 19 + Vite 8 SPA. Zustand for state, Radix UI + Tailwind for UI primitives, TipTap for the rich-text article editor (with `turndown` + `turndown-plugin-gfm` for TipTap→Markdown), MSW for the dev mock layer.

- **MSW gate** (`src/main.tsx`): MSW only starts when `import.meta.env.DEV && import.meta.env.VITE_MSW_ENABLED !== 'false'`. Production builds hit the real API. Disable in dev with `VITE_MSW_ENABLED=false`.
- **API base**: `lib/api.ts` reads `VITE_API_URL` (prod default points at the Laravel host); Bearer header for non-SPA endpoints.
- **Routing**: `routes/index.tsx` registers all surfaces; admin pages are `React.lazy()` wrapped in `ErrorBoundary` + `Suspense` (code splitting).
- **MSS handlers** (`src/mocks/handlers.ts` + `db.ts`): mirror the backend route surface during dev. When wiring a real endpoint, remove or gate the matching handler.

## Critical context

- **Spec**: `sabia_spec_v3.md` — authoritative v3.0 spec (46 KB). Source of truth for RLS policies, SSE streaming contract, AI provider interface, rate limits, security headers, widget embed contract. When the spec and code disagree, the spec wins.
- **Execution plan**: `PLANO_EXECUCAO.md` — 4-phase plan (quick wins → core backend → AI+RAG → hardening) with progress markers per phase. Check it before starting new work; the phase you're on defines what's expected next.
- **Progress log**: `PROGRESS_SUMMARY.md` — running record of what's been built. Worth a glance when resuming work.
- **AI provider is pluggable** (`AIProvider` interface): Gemini default, OpenAI/Anthropic supported. Settings are runtime-configurable via `ai_settings`; admin has a live "test-prompt" streaming endpoint (`POST /api/admin/settings/ai/test-prompt`).
- **No Spatie Permission**: role checks are hand-written middleware (`CheckRole`), not package-based — keep it that way per the spec.
- **SSE via plain PHP-FPM**: `response()->stream()` (not Octane/Swoole). Don't introduce long-lived connection dependencies.
- **MSW in production**: keep available behind `VITE_MSW_ENABLED=true` for demo/internal environments.

## Environment

- PHP 8.3.31, Composer 2.10.1, Laravel 13.8
- Node.js 22.16.0, npm 10.9.2
- PostgreSQL 18.4 with pgvector 0.8.5
