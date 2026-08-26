# Sabiá — Frontend

Chatbot de suporte com base de conhecimento + IA, baseado na spec `sabia_spec_v3.md`.

Stack: **Vite + React 18 + TypeScript + Tailwind CSS + shadcn-style + Radix UI + TipTap + MSW**.

## Como rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
npm run preview  # serve dist/
```

## Credenciais de demo

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Gestor | `gestor@bsoft.com.br` | `sabia123` |
| Operador | `ana.silva@bsoft.com.br` | `sabia123` |

## Estrutura

```
src/
├── components/
│   ├── ui/           # shadcn-style: Button, Input, Dialog, Table, Tabs, Select, Switch…
│   ├── layout/       # AppShell, Sidebar, Topbar (com theme toggle + busca)
│   ├── editor/       # TipTapEditor com slash menu (/) + 13 blocos
│   ├── chat/         # (chat components reusáveis)
│   └── common/       # MarkdownRenderer, StarRating, ConfidenceBadge, PageHeader, EmptyState, CategoryIcon
├── hooks/
│   └── useChat.ts    # stream SSE simulado
├── stores/
│   ├── auth.ts       # zustand + persist (token + user)
│   ├── theme.ts      # light/dark
│   ├── brand.ts      # white-label (aplica CSS vars em :root)
│   └── toast.ts      # toasts globais
├── mocks/
│   ├── browser.ts    # setupWorker MSW
│   ├── handlers.ts   # ~50 endpoints da spec
│   └── db.ts         # seed mínimo em memória
├── lib/
│   ├── api.ts        # fetch wrapper com Bearer token
│   └── utils.ts      # cn, formatadores, hexToHsl, downloadText, slugify
├── pages/
│   ├── Login.tsx
│   ├── kb/           # KnowledgeBase + ArticleView (markdown + feedback)
│   ├── chat/         # Chat com stream, upload, rating 1-5, transferir humano
│   ├── admin/
│   │   ├── Articles + ArticleEditor (TipTap + versões)
│   │   ├── Categories (CRUD + color picker + ícones)
│   │   ├── Users (CRUD + roles + ativo/inativo)
│   │   ├── Ratings (distribuição + CSV)
│   │   ├── WidgetConversations (filtros + dialog + TXT export)
│   │   ├── KnowledgeGaps (resolve + criar artigo)
│   │   ├── AuditLogs (diff visual + CSV)
│   │   ├── SystemLogs (filtros por nível)
│   │   ├── Health (IA + Teams + manutenção + erros)
│   │   └── settings/
│   │       ├── AISettings (provider, prompt + test-prompt live, RAG)
│   │       ├── WidgetSettings (TipTap welcome, suporte, Teams, embed)
│   │       └── BrandSettings (color picker + presets + preview ao vivo)
│   └── widget/
│       └── WidgetDemo (widget flutuante nível public)
├── routes/
│   └── index.tsx     # rotas protegidas por role
└── types/
    └── index.ts      # tipos espelhando o schema SQL da spec
```

## Features implementadas

### Tema & White-label
- Laranja vibrante `#FF6B35` + branco como padrão
- Dark mode com toggle (persistido em localStorage, segue SO por padrão)
- Brand settings aplicadas em tempo real via CSS variables (`--primary`, `--secondary`, `--ring`)
- 8 predefinições de cor no admin
- Color picker nativo + preview ao vivo no painel White Label

### TipTap
- Slash menu com 13 blocos (H1-H3, listas, checklist, code, tabela, imagem, link, divider)
- Toolbar com atalhos
- Output em markdown (HTML→MD converter)
- Highlight de código via lowlight
- Placeholder

### Chat
- Stream SSE token-a-token (simulado via MSW)
- Upload de até 5 imagens (4MB cada, preview, remove)
- Indicador de confiança (high/low/none) + sources
- Rating 1-5 estrelas ao encerrar
- Transferir para humano
- Exportar conversa em TXT (formato da spec)
- Nova conversa / parar stream

### Admin
- CRUD completo para artigos, categorias, usuários
- Versionamento de artigos + revert
- Importar markdown (placeholder)
- Test-prompt ao vivo (stream SSE) na config de IA
- Auditoria com diff visual antes/depois
- Filtros em todas as tabelas
- Export CSV/TXT conforme spec

### Widget flutuante
- Botão flutuante com badge
- Painel expansível/minimizável
- Stream SSE nível `public` (sem fontes diretas)
- Demo com código de embed copiável

### Segurança (no frontend)
- Auth store com persistência
- ProtectedRoute por role (gestor/operador)
- Botões/links admin ocultos para operador
- DOMPurify em todo markdown renderizado
- Validador de tamanho de imagem no upload

## Mapeamento para o backend Laravel

O frontend consome exatamente os endpoints da seção 10 da spec. Quando o backend Laravel estiver pronto:

1. Remover `src/mocks/` e a inicialização do MSW em `src/main.tsx`
2. Configurar `VITE_API_BASE` ou ajustar `BASE` em `src/lib/api.ts`
3. Ajustar o handler de SSE em `src/hooks/useChat.ts` caso o formato dos chunks seja diferente

## Screenshots

Disponíveis em `/home/z/my-project/download/`:
- `01-kb.png` — Base de Conhecimento (light)
- `02-chat.png` — Chat com IA
- `03-brand.png` — White Label (com preview ao vivo)
- `04-widget-settings.png` — Config Widget
- `05-ai-settings.png` — Config IA
- `06-widget-demo.png` — Demo do widget flutuante
- `07-widget-opened.png` — Widget aberto
- `08-articles-admin.png` — CRUD artigos
- `09-article-editor.png` — Editor TipTap
- `10-ratings.png` — Avaliações com distribuição
- `11-health.png` — Saúde do sistema
- `12-audit.png` — Auditoria com diff
- `13-system-logs.png` — Logs do sistema
- `14-categories.png` — Categorias
- `15-users.png` — Usuários
- `16-gaps.png` — Lacunas de conhecimento
- `17-widget-convs.png` — Chats do widget
- `18-kb-dark.png` — KB em dark mode
- `19-article-view.png` — Visualização de artigo

## Próximos passos sugeridos

- Conectar ao backend Laravel real (remover MSW)
- Implementar widgets reais de embed (`sabia-widget.js`)
- Code-splitting para reduzir o bundle (hoje ~700KB gzip)
- Adicionar testes (Vitest + Testing Library)
- i18n (estrutura já pronta para troca de idioma)
