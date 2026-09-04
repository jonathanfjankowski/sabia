# Documentação Frontend — Sabiá

> React 19 + Vite 8 + TypeScript + Zustand + Radix UI + Tailwind CSS

---

## Estrutura de Pastas

```
sabia-frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/           # Primitivos Radix (Button, Input, Dialog, etc.)
│   │   ├── common/       # Componentes reutilizáveis (MarkdownRenderer, StarRating, etc.)
│   │   ├── editor/       # TipTapEditor (rich text)
│   │   └── layout/       # AppShell, Sidebar, Topbar
│   ├── hooks/            # useChat, useAuth, etc.
│   ├── lib/
│   │   ├── api.ts        # Cliente HTTP + ApiError
│   │   └── utils.ts      # cn(), formatTime, downloadText, etc.
│   ├── mocks/
│   │   ├── handlers.ts   # MSW handlers (dev)
│   │   ├── db.ts         # Mock database
│   │   └── browser.ts    # MSW worker setup
│   ├── pages/
│   │   ├── chat/         # Chat.tsx
│   │   ├── kb/           # KnowledgeBase, ArticleView
│   │   ├── admin/        # CRUD pages + settings
│   │   └── widget/       # PublicWidget, WidgetDemo
│   ├── routes/
│   │   └── index.tsx     # React Router + lazy + ErrorBoundary
│   ├── stores/
│   │   ├── auth.ts       # Zustand: user, token, setSession, clear
│   │   ├── brand.ts      # Zustand: brand settings + applyBrand()
│   │   ├── theme.ts      # Zustand: dark/light
│   │   └── toast.ts      # Zustand: toast notifications
│   ├── types/
│   │   └── index.ts      # Tipos TypeScript (Profile, Article, Message, etc.)
│   ├── App.tsx
│   └── main.tsx          # Bootstrap + MSW gate
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Superfícies (Routes)

| Rota | Componente | Acesso | Descrição |
|------|------------|--------|-----------|
| `/login` | `Login` | Público | Autenticação email/senha |
| `/kb` | `KnowledgeBase` | Interno | Lista artigos por categoria + busca |
| `/kb/:slug` | `ArticleView` | Interno | Visualiza artigo (markdown renderizado) |
| `/chat` | `Chat` | Interno | Chat IA com SSE, upload imagens, rating |
| `/admin/*` | Vários | Gestor | Painel administrativo completo |
| `/widget` | `PublicWidget` | Público | Widget embedável (iframe) |
| `/widget-demo` | `WidgetDemo` | Interno | Preview do widget embedável |

**Proteção:**
- `Protected` wrapper exige `token` no Zustand + role opcional
- Lazy loading + `Suspense` + `ErrorBoundary` em todas as rotas

---

## Stores (Zustand)

### `auth.ts` — `useAuthStore`
```typescript
{
  user: Profile | null
  token: string | null
  setSession(user, token): void
  clear(): void
  isAuthenticated(): boolean
}
```
Persistido em `localStorage` (`sabia-auth`).

### `brand.ts` — `useBrandStore`
```typescript
{
  brand: BrandSettings
  setBrand(brand): void
  applyBrand(): void  // injeta CSS vars, favicon, Google Font
}
```
Persistido em `localStorage` (`sabia-brand`).

### `toast.ts` — `useToastStore`
```typescript
{
  toasts: Toast[]
  success(msg): void
  error(msg): void
  warning(msg): void
  info(msg): void
  dismiss(id): void
}
```

---

## Hooks Principais

### `useChat.ts` — `useChat({ endpoint, initialConversationId, initialMessages })`
Gerencia chat com streaming SSE.
```typescript
{
  messages: Message[]
  isStreaming: boolean
  streamingText: string
  conversationId: string | undefined
  error: string | null
  send(text, images?, callbacks?): Promise<void>
  stop(): void
  reset(): void
  setMessages(msgs): void
}
```
**Callbacks:** `onMessageStart`, `onChunk`, `onMessageEnd`, `onError`, `onTimeout` (60s default).

### `useAuth.ts` — `useAuthStore` (direto)

---

## Componentes-Chave

### `TipTapEditor` (`components/editor/TipTapEditor.tsx`)
Editor rich text com slash commands (`/`).
- **Extensões:** StarterKit, Image, Table, TaskList, CodeBlockLowlight, Blockquote, HR, Placeholder
- **Markdown:** Turndown + GFM (HTML → MD) + marked + DOMPurify (MD → HTML)
- **Slash commands (15):** H1-H3, Paragraph, Bullet/Ordered/Task List, Code, Quote, Table, Image, Article ref, Link, HR
- **Upload imagem:** `pickImageFile()` → `POST /admin/articles/upload-image` → insere URL
- **Paste/Drop imagem:** Upload automático via `uploadImageFile()` (não base64)
- **Article picker:** Busca artigos via `/api/articles` e insere `[Título](/kb/articles/slug)`

### `MarkdownRenderer` (`components/common/MarkdownRenderer.tsx`)
Renderiza markdown com `marked` + `DOMPurify` + `highlight.js`.
Config sync com TipTap: `breaks: true, gfm: true`.

### `Chat` (`pages/chat/Chat.tsx`)
- Composer: textarea auto-resize, drag&drop/paste imagem, contador chars (2000)
- Messages: bolhas user/assistant, markdown, confidence badge, sources links, feedback (thumbs up/down), copy, regenerate
- Rating prompt após resposta (5 estrelas)
- Export TXT, nova conversa
- Streaming bubble com typing dots

### `PublicWidget` (`pages/widget/PublicWidget.tsx`)
- Minimizável, welcome message markdown
- Transfer to human (link + telefone)
- Maintenance mode gate
- Token via query param `?t=w-xxx`
- Brand dinâmico (cores, nome)

---

## Fluxos Principais

### Autenticação
1. `Login.tsx` → `POST /api/auth/login`
2. Sucesso → `useAuthStore.setSession(user, token)` → redirect `/kb`
3. `api.ts` injeta `Authorization: Bearer {token}` automaticamente

### Chat Interno
1. Usuário digita → `useChat.send()`
2. `api.raw('/chat', { method: 'POST', body, signal })` → SSE stream
3. Chunks chegam → `onChunk` → `streamingText` atualiza UI
4. `[DONE]` → `onMessageEnd` → salva mensagem final
5. Se `confidence_level === 'none'` → registra knowledge gap

### Widget Embed
1. Página externa carrega `<script src="sabia-widget.js" data-token="w-xxx">`
2. Script cria Shadow DOM host + iframe para `/widget?t={token}`
3. `PublicWidget` carrega settings/brand via `/widget/settings`, `/widget/brand`
4. Chat via SSE `/widget/chat` com `session_id`
5. `postMessage` para open/close via `window.SabiáWidget`

---

## Tipos Principais (`types/index.ts`)

```typescript
interface Profile {
  id: string
  user_id: string
  full_name: string
  role: 'gestor' | 'operador'
  is_active: boolean
}

interface Article {
  id: number
  title: string
  slug: string
  content: string       // markdown
  summary?: string
  category_id: number
  access_level: 'public' | 'internal'
  status: 'active' | 'draft' | 'archived'
  views_count: number
  helpful_yes: number
  helpful_no: number
  version: number
  created_by: string
}

interface Conversation {
  id: string
  user_id?: string
  session_id?: string
  source: 'direct' | 'widget' | 'kb'
  access_level: 'public' | 'internal'
  title?: string
  is_closed: boolean
  rating?: number
  transfer_status?: 'transferred' | 'out_of_hours' | 'no_answer'
}

interface Message {
  id: number
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[]      // base64 data URIs
  sources?: Source[]
  has_images: boolean
  confidence?: number
  confidence_level?: 'high' | 'low' | 'none'
}

interface AiSettings {
  provider: 'gemini' | 'openai' | 'anthropic'
  endpoint: string
  api_key: string        // encrypted
  model: string
  embedding_model?: string
  temperature: number
  max_tokens: number
  system_prompt?: string
  chunk_size: number
  chunk_overlap: number
  rag_top_n: number
  confidence_threshold: number
  language: string
}
```

---

## Scripts de Dev

```bash
# Inicia dev server (Vite :5173)
npm run dev

# Build produção (tsc + vite build → dist/)
npm run build

# Preview build local
npm run preview

# Lint (oxlint)
npm run lint

# Typecheck
npx tsc --noEmit
```

---

## MSW (Mock Service Worker)

**Ativação:** apenas `DEV` e `VITE_MSW_ENABLED !== 'false'`
```typescript
// main.tsx
if (import.meta.env.DEV && import.meta.env.VITE_MSW_ENABLED !== 'false') {
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}
```

**Mocks:** `mocks/handlers.ts` (50+ endpoints), `mocks/db.ts` (dados fake).

---

## Variáveis de Ambiente (`.env`)

```env
VITE_API_URL=http://localhost:8000/api    # Backend URL
VITE_MSW_ENABLED=true                     # true/false (dev only)
```

---

## Build & Deploy

```bash
# Build
npm run build
# Output: dist/

# Deploy static (Vercel, Netlify, Cloudflare Pages)
# Configurar SPA fallback para index.html
```

---

## Dependências Notáveis

| Pacote | Uso |
|--------|-----|
| `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-*` | Editor rich text |
| `turndown`, `turndown-plugin-gfm` | HTML → Markdown |
| `marked`, `dompurify`, `highlight.js` | Markdown → HTML |
| `zustand` | State management |
| `@radix-ui/*` | UI primitives (Dialog, Dropdown, Tabs, etc.) |
| `react-router-dom` | Routing |
| `lucide-react` | Icons |
| `date-fns` | Formatação de datas |
| `clsx`, `tailwind-merge` | Classnames condicionais |
| `msw` | Mock API (dev) |
---

## Atualização 04/09/2026

### Novas telas: Sugestões de Artigo (gestor + operador)

| Rota | Página | Descrição |
|------|--------|-----------|
| `/article-suggestions` | `pages/admin/ArticleSuggestions.tsx` | “Minhas Sugestões”: filtros de status/categoria na URL, paginação (20), ações por status (editar/cancelar quando pendente; excluir quando rejeitada; link do artigo quando publicada) |
| `/article-suggestions/new` e `/article-suggestions/:id/edit` | `pages/admin/ArticleSuggestionEditor.tsx` | Reusa `ArticleForm` em modo sugestão (salva rascunho; sem Publicar) |
| `/article-suggestions/:id` | `pages/admin/ArticleSuggestionEditor.tsx` | Edição de sugestão própria |
| `/admin/article-suggestions/:id` | `pages/admin/ArticleSuggestionReview.tsx` | Revisão do gestor: **Aprovar e publicar**, **Aprovar com edição** ou **Rejeitar** com observação obrigatória |

> Observação: no estado atual o editor de sugestão usa sempre o modo `suggestion-create` (edição cai no mesmo modo) e a feature está bloqueada no backend por GRANTs ausentes ([relatório de testes](RELATORIO_TESTES_E2E.md), Bugs #2/#5).

### Tipo `AiSettings` ampliado

`src/types/index.ts` inclui agora `EmbeddingProvider` (`sidecar | openai | gemini | custom`) e os campos `embedding_model`, `embedding_endpoint`, `embedding_api_key`, `stream_timeout_seconds`; `max_tokens` pode ser `null`. A tela `AISettings.tsx` tem 3 abas (Conexão / System Prompt / RAG & Confiança), indicador de saúde do sidecar, **Testar embedding** (`test-embed`) e **Testar prompt ao vivo** (SSE).

### `useChat.ts` — comportamento de timeout

Timeout **total único** (padrão 180 s) obtido de `GET /chat/config` (`stream_timeout_seconds`), abortando o stream, preservando texto parcial e injetando mensagem “⏱️ A resposta não foi concluída em N segundos”. Não há retry automático. Erros HTTP são expostos como `HTTP <status>` (melhoria pendente: extrair `body.message` — [Bug #5](RELATORIO_TESTES_E2E.md)).
