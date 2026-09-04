# Correções — Sabiá (bugs críticos + segurança + desempenho)

Verifiquei pessoalmente todos os achados críticos no código antes de planejar. Escopo escolhido (julgamento, sem resposta do usuário): **críticos + segurança alta + ganhos rápidos de desempenho**. Refactors maiores ficam documentados como recomendação futura.

## Fase 1 — Bugs críticos de funcionalidade

1. **`splitContent` private** — `ArticleChunkService.php:131`: tornar `public` (corrige 500 em `POST /api/admin/articles/preview-import`).
2. **SSE sem `conversation_id`** — em `ChatController::send` e `PublicWidgetController::chat`, emitir como 1º evento do stream `data: {"conversation_id":"...","session_id":"..."}` antes dos chunks. Os frontends já tratam (`useChat.ts:100`, `PublicWidget.tsx:93`) — para de criar conversa órfã a cada mensagem e reabilita avaliação/transferência/export.
3. **Máscara sobrescreve API key** — em `SettingsController::aiUpdate`, descartar `api_key`/`embedding_api_key` quando o valor vier igual à máscara `••••••••` (ou vazio). No frontend (`AISettings.tsx`), não reenviar as chaves quando inalteradas.
4. **`confidence_level` perdido** — migration nova adicionando coluna `confidence_level` (string nullable) em `messages`; adicionar ao `$fillable` de `Message`.
5. **`embedding_provider` descartado** — adicionar ao `$fillable` de `AiSettings` (coluna já existe).
6. **Histórico do chat errado** — `ChatController.php:92`: trocar `orderBy('created_at')->limit(20)` por últimas 20 (`orderByDesc(...)->limit(20)->get()->reverse()`), excluindo a mensagem recém-salva (`whereKeyNot($userMsg->id)`); aplicar o mesmo histórico no widget (hoje passa `[]`).
7. **Widget engole erros HTTP** — `PublicWidget.tsx`: `if (!res.ok)` antes de ler o stream + exibir mensagem de erro no chat.
8. **Widget responde sem RAG** — em `PublicWidgetController::chat`, `if (empty($embedding)) return 503` (como `ChatController`; o `try/catch` atual é código morto pois `embed()` nunca lança).
9. **Health check sempre "conectado"** — `HealthController.php:29`: `$aiConnected = ! empty($provider->embed('health_check'))`.
10. **`user_name` inexistente** — adicionar accessor `getUserNameAttribute` em `Conversation` (`$this->user?->full_name ?? 'Anônimo'`), corrigindo os 3 usos em `SupportTransferService` (Teams sempre notifica "Anônimo").

## Fase 2 — Segurança

11. **Segredos no audit log** — em `aiUpdate`/`widgetUpdate`/`brandUpdate`, mascarar `api_key`, `embedding_api_key`, `teams_webhook_url` em `$old`/`$new` antes de `AuditService::record` (hoje grava as chaves decifradas em `audit_logs`).
12. **Webhook do Teams público** — `PublicWidgetController::settings()`: whitelist de campos públicos (welcome_message, support_*, out_of_hours, maintenance_*) em vez de `toArray()` completo.
13. **Hijack de conversas do widget** — validar posse por `session_id` em `chat()`/`close()`/`transfer()` (conversa só é acessível se `session_id` da request confere); gerar `session_id` server-side (CSPRNG) quando ausente. No widget (`PublicWidget.tsx`), trocar o `session_id = token` compartilhado por `crypto.randomUUID()` por visitante.
14. **IDOR no ChatController** — replicar o ownership check do `ConversationController` (dono da conversa ou gestor; senão 403).
15. **Login** — rate limit por `ip|email` (além de IP), mensagem única "Credenciais inválidas." para conta inativa/inexistente e `Hash::check` dummy contra enumeração por timing.
16. **Tokens sem expiração** — `config/sanctum.php`: `expiration = 480`.
17. **Docker** — remover `ports: 5432` do postgres no `docker-compose.prod.yml`; `.dockerignore` com `.env`; `APP_KEY` injetada por env no compose (remover `key:generate` do Dockerfile; entrypoint já tem fallback).
18. **Sidecar** — limites no Pydantic (`text` ≤ 32k chars, batch ≤ 64 itens) + token compartilhado opcional por header (env) validado no FastAPI.

## Fase 3 — Desempenho (quick wins)

19. **Cache de settings** — `Cache::remember` (TTL 300s) em `AiSettings::current()`, `WidgetSettings::current()`, `BrandSettings::current()` + invalidação nos updates do `SettingsController` (hoje: 3-4 queries + descriptografia por request de chat; zero uso de cache no app).
20. **`CACHE_STORE`** — corrigir `.env.example`/compose: `CACHE_STORE=file` (o config lê `CACHE_STORE`; hoje cai no driver `database` sem querer).
21. **N+1 no RatingController** — `with('user')` + teto de registros.
22. **Teto nas listagens** — `limit(200)` (com `?limit` limitado) em AuditLog, SystemLog, WidgetConversations, ConversationController, KnowledgeGap, Ratings (listas crescem indefinidamente, frontend filtra tudo em memória).
23. **`/articles` sem `content`** — `->select([...])` sem a coluna TEXT na listagem (a KB não usa `content` no cliente — verificado).
24. **Índices** — migration: `conversations(created_at)`, `conversations(source, created_at)`, `messages(conversation_id, created_at)`, `audit_logs(created_at)`, `system_logs(created_at)`.
25. **Sidecar resiliente** — `connect_timeout(2)` + timeout de 10s no caminho do chat + flag em cache "sidecar down" (TTL 60s) para pular a tentativa (hoje: 30s de espera por mensagem quando cai).
26. **RLS sem transação envolvente** — `SetRlsContext`: trocar `DB::transaction` + `SET LOCAL ROLE` por `SET ROLE`/`set_config` de sessão na conexão da request (com restore no fim), removendo a transação aberta durante chamadas HTTP de embedding (esgotamento do pool do Postgres).

## Fora do escopo (recomendações futuras — ficam documentadas no relatório final)

Streaming SSE incremental real (hoje bufferizado no `AIProvider`); queue para re-chunk/embeddings; nginx+php-fpm em prod; token de widget HMAC; CSP parametrizada por env; retenção/prune de logs; detector de prompt injection em PT-BR; ferramentas de paginação completa no frontend.

## Verificação

- `php artisan test` (sabia-api) — corrigir testes que os fixes quebrarem (ex.: settings mockando máscara).
- Build do frontend e widget (`npm run build` + `tsc`) para validar mudanças TS.
- Revisão cruzada front/back dos eventos SSE (contrato `conversation_id`/`session_id`).