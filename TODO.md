# 📋 TODO - Plataforma de IA com Editor de Texto

## 🎯 Visão Geral
Plataforma full-stack com editor de texto rico (TipTap) integrado a assistentes de IA, permitindo chat em tempo real via Server-Sent Events (SSE).

---

## 🏗️ Backend (Laravel 11+)

### 1. Banco de Dados
- [ ] **Migrations**
  - `users` (id, name, email, password, avatar, created_at, updated_at)
  - `conversations` (id, user_id, title, model, system_prompt, created_at, updated_at)
  - `messages` (id, conversation_id, role [user/assistant/system], content, token_count, created_at)
  - `documents` (id, user_id, title, content_json, word_count, created_at, updated_at)
  - `ai_providers` (id, name, api_key, endpoint, is_active)
  - `usage_logs` (id, user_id, tokens_used, cost, created_at)

- [ ] **Seeders**
  - UserSeeder (usuário admin padrão)
  - AiProviderSeeder (OpenAI, Anthropic, Google configuráveis)

### 2. Models & Relacionamentos
- [ ] `User` → hasMany Conversations, hasMany Documents
- [ ] `Conversation` → belongsTo User, hasMany Messages
- [ ] `Message` → belongsTo Conversation
- [ ] `Document` → belongsTo User, hasJsonContent()
- [ ] `AiProvider` → static methods para factory pattern
- [ ] `UsageLog` → belongsTo User, scopes por período

### 3. Controllers (API REST + SSE)
- [ ] **AuthController**
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/logout
  - GET /api/auth/me

- [ ] **ConversationController**
  - GET /api/conversations (listar do usuário)
  - POST /api/conversations (criar nova)
  - GET /api/conversations/{id} (detalhes + mensagens)
  - PUT /api/conversations/{id} (atualizar título/modelo)
  - DELETE /api/conversations/{id}

- [ ] **MessageController**
  - POST /api/conversations/{id}/messages (enviar mensagem → inicia SSE)
  - GET /api/messages/{id}/stream (endpoint SSE para streaming)

- [ ] **DocumentController**
  - GET /api/documents
  - POST /api/documents
  - GET /api/documents/{id}
  - PUT /api/documents/{id}
  - DELETE /api/documents/{id}
  - POST /api/documents/{id}/ai-action (aplicar edição via IA)

- [ ] **SettingsController**
  - GET /api/settings/providers
  - PUT /api/settings/providers/{id}
  - GET /api/settings/usage

### 4. Serviços de IA
- [ ] **AiService Interface**
  ```php
  interface AiServiceInterface {
      public function chat(array $messages): StreamedResponse;
      public function countTokens(string $text): int;
      public function getModels(): array;
  }
  ```

- [ ] **Implementações**
  - `OpenAiService` (GPT-4, GPT-3.5-turbo)
  - `AnthropicService` (Claude 3)
  - `GoogleAiService` (Gemini Pro)
  - Factory: `AiServiceFactory::make($provider)`

- [ ] **Streaming Service**
  - Classe `SseStreamHandler` para gerenciar conexões SSE
  - Buffer de chunks e envio em tempo real
  - Timeout e reconexão automática

### 5. Middleware
- [ ] `Authenticate` (JWT ou Sanctum)
- [ ] `CheckAiQuota` (limitar uso por plano)
- [ ] `Cors` (configurar origens permitidas)
- [ ] `ThrottleRequests` (rate limiting na API)

### 6. Validações & Requests
- [ ] `StoreConversationRequest`
- [ ] `SendMessageRequest`
- [ ] `UpdateDocumentRequest`
- [ ] `AiActionRequest`

### 7. Jobs & Filas
- [ ] `ProcessLongDocumentJob` (análise de documentos grandes)
- [ ] `SyncUsageStatsJob` (atualizar logs de uso periodicamente)
- [ ] `CleanupOldConversationsJob` (limpeza agendada)

### 8. Configurações
- [ ] `config/ai.php` (providers, modelos, limites)
- [ ] `config/sse.php` (timeout, buffer size)
- [ ] Variáveis de ambiente no `.env.example`

---

## 🎨 Frontend (React 18+ + Vite)

### 1. Estrutura de Pastas
```
src/
├── components/
│   ├── ui/              # Componentes base (Button, Input, Modal...)
│   ├── layout/          # Header, Sidebar, MainLayout
│   ├── chat/            # ChatBox, MessageBubble, TypingIndicator
│   ├── editor/          # TipTapEditor, Toolbar, Menu
│   └── settings/        # ProviderConfig, UsageStats
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Conversation.tsx
│   ├── DocumentEditor.tsx
│   └── Settings.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useChat.ts       # Lógica SSE + estado do chat
│   ├── useEditor.ts     # TipTap state + commands
│   └── useApi.ts        # Axios instance + interceptors
├── services/
│   ├── api.ts           # Configuração axios
│   ├── auth.service.ts
│   ├── conversation.service.ts
│   ├── document.service.ts
│   └── sse.service.ts   # EventSource wrapper
├── store/               # Zustand ou Context API
│   ├── auth.store.ts
│   ├── chat.store.ts
│   └── editor.store.ts
├── utils/
│   ├── formatters.ts
│   ├── validators.ts
│   └── constants.ts
└── types/
    ├── index.ts
    ├── conversation.ts
    ├── message.ts
    └── document.ts
```

### 2. Componentes de UI (Base)
- [ ] `Button` (variants: primary, secondary, ghost, danger)
- [ ] `Input` / `TextArea`
- [ ] `Modal` / `Dialog`
- [ ] `Dropdown` / `Select`
- [ ] `Toast` (notificações)
- [ ] `Skeleton` (loading states)
- [ ] `Avatar`
- [ ] `Badge`
- [ ] `Tooltip`

### 3. Layout Principal
- [ ] `Header` (logo, user menu, notifications)
- [ ] `Sidebar` (navegação: conversations, documents, settings)
- [ ] `MainLayout` (wrapper com sidebar responsiva)

### 4. Páginas
- [ ] **Login/Register**
  - Formulários com validação
  - Redirecionamento pós-auth

- [ ] **Dashboard**
  - Lista de conversações recentes
  - Lista de documentos
  - Stats de uso (tokens, custo)
  - Botão "Nova Conversa" / "Novo Documento"

- [ ] **Conversation**
  - Lista de mensagens (scroll automático)
  - Input de mensagem com botão enviar
  - Indicador de "digitando..."
  - Seletor de modelo AI
  - Botões: limpar, exportar, deletar

- [ ] **DocumentEditor**
  - TipTap Editor com conteúdo JSON
  - Toolbar formatada (bold, italic, lists, headings)
  - Menu lateral com ações de IA:
    - "Melhorar texto"
    - "Resumir"
    - "Expandir"
    - "Traduzir"
    - "Corrigir gramática"
  - Contador de palavras/token
  - Auto-save (debounced)

- [ ] **Settings**
  - Configurar API keys dos providers
  - Selecionar modelo padrão
  - Ver histórico de uso
  - Perfil do usuário

### 5. Hooks Customizados
- [ ] `useAuth`
  - login(), logout(), register()
  - Estado: user, isAuthenticated, loading

- [ ] `useChat`
  - sendMessage(conversationId, content)
  - connectSSE(conversationId) → EventSource
  - Estado: messages, isLoading, error
  - Handlers: onOpen, onMessage, onError

- [ ] `useEditor`
  - initialize(content)
  - getContent(), setContent()
  - applyAiEdit(action, selection)
  - save()

- [ ] `useApi`
  - Axios instance com interceptor de auth
  - Error handling global
  - Request/response logging (dev)

### 6. Editor TipTap
- [ ] Configuração básica
  ```ts
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Digite ou cole seu texto...' }),
      CharacterCount,
      Highlight,
      TextStyle,
      Color,
    ],
    content: initialContent,
  })
  ```

- [ ] Toolbar customizada
  - Botões de formatação
  - Seletor de heading
  - Cor de texto/highlight
  - Menu de ações de IA (dropdown)

- [ ] Comandos de IA
  - Inserir texto gerado na seleção
  - Substituir seleção
  - Adicionar ao final

### 7. Integração SSE (Real-time)
- [ ] Serviço `sse.service.ts`
  ```ts
  class SseService {
    connect(url: string, callbacks: SseCallbacks) {
      const eventSource = new EventSource(url);
      eventSource.onmessage = (e) => callbacks.onMessage(JSON.parse(e.data));
      eventSource.onerror = callbacks.onError;
      return () => eventSource.close();
    }
  }
  ```

- [ ] Hook `useChat` integrando SSE
  - Conectar ao endpoint `/api/messages/{id}/stream`
  - Parsear chunks JSON `{ chunk: "texto", done: false }`
  - Atualizar estado da mensagem em tempo real
  - Lidar com reconexão em caso de erro

### 8. Gerenciamento de Estado
- [ ] **Zustand stores** (ou Context API)
  - `authStore`: user, token, actions
  - `chatStore`: conversations, activeConversation, messages
  - `editorStore`: currentDocument, content, unsavedChanges
  - `settingsStore`: providers, preferences

### 9. Estilização
- [ ] Tailwind CSS configurado
- [ ] Tema claro/escuro (opcional)
- [ ] Responsividade (mobile-first)
- [ ] Animações (Framer Motion ou CSS transitions)

---

## 🔌 Integração & Testes

### 1. Backend Tests
- [ ] Feature tests para endpoints da API
- [ ] Unit tests para serviços de IA (mocks)
- [ ] Testes de integração SSE
- [ ] Testes de autenticação e autorização

### 2. Frontend Tests
- [ ] Component tests (React Testing Library)
- [ ] Hook tests
- [ ] E2E tests (Playwright ou Cypress)
  - Fluxo completo: login → criar conversa → enviar mensagem → ver streaming
  - Editor: digitar → ação de IA → verificar resultado

### 3. Documentação
- [ ] README.md atualizado
  - Instruções de instalação
  - Variáveis de ambiente necessárias
  - Comandos úteis (docker, npm, artisan)

- [ ] API Documentation (OpenAPI/Swagger ou Postman collection)
  - Todos os endpoints
  - Exemplos de request/response
  - Autenticação

- [ ] Arquivo CHANGELOG.md

### 4. Deploy
- [ ] Docker Compose para produção
  - Otimizações de performance
  - Volumes persistentes
  - Networks segregadas

- [ ] Scripts de CI/CD (GitHub Actions)
  - Run tests
  - Build images
  - Deploy (opcional)

- [ ] Environment variables para produção
  - `.env.production` example
  - Secrets management

---

## 🚀 Ordem Sugerida de Implementação

### Fase 1: Fundação (Backend) ✅ CONCLUÍDA
1. ✅ Migrations e models
2. ✅ Auth (registro/login com Sanctum) - já existente no Laravel
3. ✅ CRUD básico de conversations e messages
4. ✅ Configurar um provider de IA (OpenAI) - seeders e models prontos
5. ✅ Controllers principais (ConversationController, DocumentController)
6. ✅ Rotas API configuradas

### Fase 2: Core Features ✅ CONCLUÍDA
7. ✅ Serviço de IA com streaming (OpenAiService, AnthropicService, GoogleAiService)
8. ✅ Endpoint SSE funcional (MessageController com send e stream)
9. ✅ AiServiceFactory para factory pattern
10. ✅ Migrations atualizadas (ai_provider_id em conversations, token_count em messages)
11. ✅ Models atualizados (Conversation com relacionamento aiProvider)
12. ✅ Rotas configuradas (/api/conversations/{id}/messages, /api/messages/{id}/stream)

### Fase 3: Frontend (PRÓXIMO)
13. [ ] Frontend: auth pages + layout
14. [ ] Frontend: lista de conversas + chat básico
15. [ ] Integração SSE no frontend (EventSource)
16. [ ] TipTap editor configurado
11. Hook useChat com SSE
12. Auto-save de documentos

### Fase 4: Polimento
13. Settings page (configurar providers)
14. Usage tracking
15. Testes automatizados
16. Documentação completa

### Fase 5: Produção
17. Otimizações de performance
18. Security hardening
19. Deploy scripts
20. Monitoring e logs

---

## 📦 Dependências Principais

### Backend (composer.json)
```json
{
  "require": {
    "laravel/sanctum": "^4.0",
    "guzzlehttp/guzzle": "^7.8",
    "pusher/pusher-php-server": "^7.2"
  }
}
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "@tiptap/react": "^2.0",
    "@tiptap/starter-kit": "^2.0",
    "axios": "^1.6",
    "zustand": "^4.5",
    "react-router-dom": "^6.21",
    "framer-motion": "^10.16"
  },
  "devDependencies": {
    "@testing-library/react": "^14.1",
    "@playwright/test": "^1.40",
    "tailwindcss": "^3.4"
  }
}
```

---

## ✅ Critérios de Aceite

- [ ] Usuário pode registrar/login
- [ ] Criar nova conversa e enviar mensagens
- [ ] Resposta da IA aparece em tempo real (streaming)
- [ ] Editor de texto funciona com formatação básica
- [ ] Ações de IA aplicam edições no documento
- [ ] Histórico de conversas persistido
- [ ] Documentos salvos automaticamente
- [ ] Configurar múltiplos providers de IA
- [ ] Responsive design (desktop + mobile)
- [ ] Testes passando (>80% coverage)
- [ ] Documentação clara e completa

---

**Status**: Em desenvolvimento  
**Última atualização**: 2025-01-XX
