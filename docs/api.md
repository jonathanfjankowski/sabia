# Documentação da API — Sabiá

> Base URL: `{VITE_API_URL}/api`
> Autenticação: Bearer Token (Sanctum) ou Widget Token
> Content-Type: `application/json`

---

## Autenticação

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/auth/login` | Login (email + password) | Público |
| POST | `/auth/logout` | Logout | Sanctum |
| GET | `/auth/me` | Perfil atual | Sanctum |

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "gestor@empresa.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "gestor@empresa.com",
    "profile": {
      "id": "uuid",
      "full_name": "João Silva",
      "role": "gestor",
      "is_active": true
    }
  },
  "token": "sanctum-token..."
}
```

---

## Base de Conhecimento (KB)

### Listar artigos
```http
GET /api/articles?q=&category_id=1
Authorization: Bearer {token}
```
**Query params:** `q` (busca), `category_id` (filtro)

### Ver artigo
```http
GET /api/articles/{slug}
Authorization: Bearer {token}
```

### Artigos relacionados
```http
GET /api/articles/{id}/related
Authorization: Bearer {token}
```

### Feedback
```http
POST /api/articles/{id}/feedback
Authorization: Bearer {token}
Content-Type: application/json

{ "helpful": true }
```

### Categorias
```http
GET /api/categories
Authorization: Bearer {token}
```

### Busca híbrida
```http
GET /api/search?q=nota+fiscal
Authorization: Bearer {token}
```

---

## Chat Interno

### Enviar mensagem (SSE)
```http
POST /api/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "Como emitir NF?",
  "conversation_id": "uuid-optional",
  "images": ["base64-data-uri"] // opcional, max 5
}
```

**Stream SSE:**
```
data: {"text": "Para emitir..."}
data: {"text": " uma nota..."}
data: [DONE]
```

### Conversas
```http
GET /api/conversations
Authorization: Bearer {token}

GET /api/conversations/{id}/messages
Authorization: Bearer {token}
```

### Encerrar + Avaliar
```http
POST /api/conversations/{id}/close
Authorization: Bearer {token}
Content-Type: application/json

{ "rating": 5 }
```

### Transferir para humano
```http
POST /api/conversations/{id}/transfer
Authorization: Bearer {token}
```

### Exportar TXT
```http
GET /api/conversations/{id}/export
Authorization: Bearer {token}
```

---

## Widget Público

> Endpoints sem Sanctum, com middleware `rls:widget` + `widget.origin`
> Rate limit: 30 req/min por IP

### Configurações
```http
GET /api/widget/settings
```

### Brand
```http
GET /api/widget/brand
```

### Chat (SSE)
```http
POST /api/widget/chat
Content-Type: application/json

{
  "message": "Olá",
  "conversation_id": "uuid-optional",
  "session_id": "string-optional"
}
```

### Encerrar + Avaliar
```http
POST /api/widget/conversations/{id}/close
Content-Type: application/json

{ "rating": 4 }
```

### Transferir
```http
POST /api/widget/conversations/{id}/transfer
```

---

## Admin (Gestor)

> Todos com middleware `role:gestor`

### Usuários
| Método | Endpoint |
|--------|----------|
| GET | `/api/admin/users` |
| POST | `/api/admin/users` |
| PUT | `/api/admin/users/{id}` |
| DELETE | `/api/admin/users/{id}` |

### Artigos (Admin)
| Método | Endpoint |
|--------|----------|
| GET | `/api/admin/articles` |
| POST | `/api/admin/articles` |
| PUT | `/api/admin/articles/{id}` |
| DELETE | `/api/admin/articles/{id}` (arquiva) |
| POST | `/api/admin/articles/import` |
| POST | `/api/admin/articles/preview-import` |
| POST | `/api/admin/articles/upload-image` |
| GET | `/api/admin/articles/{id}/versions` |
| POST | `/api/admin/articles/{id}/revert/{version}` |

### Categorias
| Método | Endpoint |
|--------|----------|
| GET | `/api/admin/categories` |
| POST | `/api/admin/categories` |
| PUT | `/api/admin/categories/{id}` |
| DELETE | `/api/admin/categories/{id}` |

### Lacunas de Conhecimento
| Método | Endpoint |
|--------|----------|
| GET | `/api/admin/knowledge-gaps` |
| PUT | `/api/admin/knowledge-gaps/{id}/resolve` |

### Avaliações
```http
GET /api/admin/ratings?from=2024-01-01&to=2024-12-31&source=widget
```

### Chats do Widget
```http
GET /api/admin/widget-conversations?status=transferred
GET /api/admin/widget-conversations/{id}/export
```

### Logs
```http
GET /api/admin/audit-logs?action=article.create&from=2024-01-01
GET /api/admin/system-logs?level=error&context=ai.request
```

### Health
```http
GET /api/admin/health
```

### Configurações IA
| Método | Endpoint |
|--------|----------|
| GET | `/api/admin/settings/ai` |
| PUT | `/api/admin/settings/ai` |
| POST | `/api/admin/settings/ai/test-prompt` (SSE) |

### Configurações Widget
| Método | Endpoint |
|--------|----------|
| GET | `/api/admin/settings/widget` |
| PUT | `/api/admin/settings/widget` |

### Configurações Brand
| Método | Endpoint |
|--------|----------|
| GET | `/api/admin/settings/brand` |
| PUT | `/api/admin/settings/brand` |

---

## Códigos de Erro

| HTTP | Código | Descrição |
|------|--------|-----------|
| 400 | validation_error | Dados inválidos |
| 401 | unauthorized | Token inválido/expirado |
| 403 | forbidden | Permissão insuficiente / origem não autorizada |
| 404 | not_found | Recurso não encontrado |
| 422 | unprocessable | Falha de validação de negócio |
| 429 | too_many_requests | Rate limit excedido |
| 500 | server_error | Erro interno |
| 503 | service_unavailable | IA indisponível / manutenção |

---

## Rate Limits

| Contexto | Limite |
|----------|--------|
| Login | 5 tentativas / 15 min por IP |
| Chat interno | 100 req / min por usuário |
| Chat widget | 30 req / min por IP |
| Upload imagens | 20 req / min por usuário |
| API geral | 200 req / min por usuário/IP |

---

## Segurança

### Headers obrigatórios nas respostas
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY (ou SAMEORIGIN em /widget)
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
```

### CORS
- `allowed_origins` via env `ALLOWED_ORIGINS` (CSV)
- Credentials: true (Sanctum cookie)
- Headers permitidos: `Content-Type`, `Authorization`, `X-Requested-With`, `X-Session-Id`

---

## Embed Widget

```html
<script
  src="https://cdn.exemplo.com/sabia-widget.js"
  data-token="w-xxx"
  data-api-url="https://api.exemplo.com"
  data-position="bottom-right"
  data-primary-color="#6366f1"
></script>
```

### API JavaScript
```js
window.SabiáWidget.open()
window.SabiáWidget.close()
window.SabiáWidget.toggle()
window.SabiáWidget.isOpen() // boolean
```
---

## Atualização 04/09/2026 — Endpoints não documentados anteriormente

> Complemento auditado contra `routes/api.php`. Referência técnica completa em [arquitetura.md](arquitetura.md).

### Públicos

| Método | Endpoint | Descrição | Rate limit |
|--------|----------|-----------|------------|
| GET | `/health` | Health check da API (`{"status":"ok"}`) | — |

### Autenticados (gestor + operador)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/chat/config` | Configuração do chat para o cliente (`stream_timeout_seconds`) |
| POST | `/articles/{id}/view` | Registra visualização manual do artigo |
| GET | `/article-suggestions` | Lista sugestões (operador: próprias; gestor: todas, filtro `status`) — paginação 20 |
| POST | `/article-suggestions` | Cria sugestão (status `pending`) |
| GET | `/article-suggestions/{id}` | Detalhe da sugestão |
| PUT | `/article-suggestions/{id}` | Edita sugestão do próprio autor (só se `pending`) |
| POST | `/article-suggestions/{id}/cancel` | Cancela sugestão do próprio autor |

### Admin (gestor)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/admin/articles/{id}` | Detalhe administrativo (inclui rascunhos/arquivados) |
| POST | `/admin/articles/{id}/restore` | Restaura artigo com soft-delete |
| POST | `/admin/settings/ai/test-embed` | Testa o provedor de embeddings (retorna latência e dimensões) |
| GET | `/admin/embedding-sidecar/health` | Estado do sidecar local (`EMBEDDING_URL`) |
| POST | `/admin/article-suggestions/{id}/approve` | Aprova e publica sugestão como artigo |
| POST | `/admin/article-suggestions/{id}/approve-with-edit` | Aprova com ajustes antes de publicar |
| POST | `/admin/article-suggestions/{id}/reject` | Rejeita com `review_notes` obrigatório |

### Campos novos em `ai_settings` (GET/PUT `/admin/settings/ai`)

- `embedding_provider`: `sidecar` (padrão) | `openai` | `gemini` | `custom`
- `embedding_model`, `embedding_endpoint`, `embedding_api_key` (credenciais separadas para o provedor de embeddings)
- `stream_timeout_seconds`: 10–600 (default 180) — timeout do stream de chat
- `max_tokens`: agora **nullable** (null = não envia o parâmetro ao provedor)
- Respostas incluem `api_key`/`embedding_api_key` **mascaradas** (`••••••••`); reenviar a máscara não sobrescreve o segredo. Ações sensíveis são auditadas com segredos redigidos.

> Nota: a tabela `article_suggestions` nasceu sem GRANTs/policies RLS (as rotas retornavam 500); corrigido pela migration `2026_09_04_150000_grant_rls_article_suggestions_table`.
