# Embedding Sidecar — Integração com o Sabia

Serviço Python (`BAAI/bge-m3`, 1024 dims) que substitui o provedor de embedding baseado em chamada única por chunk, com fallback automático para o provedor de chat (OpenAI/Gemini).

---

## Arquitetura

```
┌──────────────┐  POST /embed         ┌─────────────────────┐
│ sabia-api    │ ───────────────────▶ │ embedding-sidecar   │
│ (Laravel)    │  POST /embed/batch   │ (Python · FastAPI)  │
│              │ ◀──── 1024 dims ──── │  BAAI/bge-m3 · CPU  │
└──────────────┘                      └─────────────────────┘
       │                                        │
       │  fallback automático                   │
       ▼                                        ▼
   provedor de chat (OpenAI / Gemini)
   caso o sidecar esteja fora
```

- **Padrão**: sidecar é o provedor padrão de embedding.
- **Fallback**: se o sidecar cair, `AIProvider::embed()` cai automaticamente para o endpoint de chat (`{endpoint}/embeddings`).
- **Batch**: criação/edição de artigo usa `POST /embed/batch` em uma única chamada. Se falhar, cai para o loop per-chunk (que respeita o fallback acima).

---

## Variáveis de ambiente

| Variável | Padrão | Onde |
|---|---|---|
| `EMBEDDING_URL` | `http://localhost:8000` (dev) / `http://embedding-sidecar:8000` (compose) | `sabia-api/.env` |

`ai_settings.embedding_provider` (`enum sidecar|openai|gemini|custom`, default `sidecar`) controla o dispatch. Os outros provedores reusam `embedding_endpoint`/`embedding_api_key` se setados, ou caem para `endpoint`/`api_key` do chat.

---

## Endpoints do sidecar

| Método | Path | Resposta |
|---|---|---|
| GET | `/health` | `{"ok": true}` |
| POST | `/embed` | `{"vector": [...1024 floats...], "dimensions": 1024}` |
| POST | `/embed/batch` | `{"vectors": [[...], [...], ...]}` |

---

## Como subir (dev)

```bash
# 1. Sobe a stack inteira (api + postgres + sidecar + web)
docker compose -f docker-compose.dev.yml up -d

# 2. Verifica o sidecar
curl http://localhost:8001/health
# {"ok": true}

# 3. Testa um embedding direto
curl -X POST http://localhost:8001/embed \
  -H 'Content-Type: application/json' \
  -d '{"text":"Como funciona o plano?"}'
# {"vector": [...], "dimensions": 1024}
```

A porta 8001 é a porta exposta do `embedding-sidecar` no `docker-compose.dev.yml` (internamente 8000). Em prod o serviço fica apenas na rede interna — sem porta exposta.

---

## Endpoints admin novos

```http
GET  /api/admin/embedding-sidecar/health
POST /api/admin/settings/ai/test-embed
```

```bash
# (logar como gestor, pegar token Sanctum)
TOKEN=...

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/embedding-sidecar/health
# {"ok": true, "url": "http://embedding-sidecar:8000"}

curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/settings/ai/test-embed
# {"ok": true, "dimensions": 1024, "latency_ms": 87}
```

`GET /api/admin/health` passa a pingar `/health` do sidecar quando `embedding_provider === 'sidecar'`, em vez de fazer um embed real.

---

## Migração de schema (768 → 1024)

A coluna `article_chunks.embedding` muda de `VECTOR(768)` para `VECTOR(1024)`. A migration:

1. `DROP INDEX IF EXISTS idx_chunks_embedding`
2. `ALTER TABLE article_chunks ALTER COLUMN embedding TYPE vector(1024)`
3. Recria o índice HNSW `vector_cosine_ops` (`m=16, ef_construction=200`).

**Atenção:** linhas existentes viram lixo após a migration (768 floats reinterpretados como 1024). É **obrigatório** rodar o re-embed antes de abrir tráfego:

```bash
docker compose -f docker-compose.dev.yml exec api php artisan chunks:reembed
```

O comando `chunks:reembed` reaproveita o `ArticleChunkService::process()` para regenerar embeddings de todos os artigos que já têm chunks. Progress bar no terminal, idempotente.

**Janela de manutenção:** o rebuild do HNSW é O(N log N). Em até ~10k chunks é instantâneo. Em 100k+ reserve uma janela de manutenção.

---

## Ordem de deploy (produção)

1. **Build do sidecar** (uma vez; baixa ~1-2GB):
   ```bash
   docker compose -f docker-compose.prod.yml build embedding-sidecar
   ```
2. **Subir sidecar** antes do `api`, para que `EMBEDDING_URL` já resolva:
   ```bash
   docker compose -f docker-compose.prod.yml up -d embedding-sidecar
   ```
3. **Subir api.** O `docker-entrypoint.sh` roda `migrate --force` e regenera `config:cache` com as envs de runtime (EMBEDDING_URL, DB_*, etc.) — **não precisa rodar migrations manualmente**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d api
   ```
4. **Verificar health do sidecar** dentro do container api:
   ```bash
   docker compose -f docker-compose.prod.yml exec api curl -s $EMBEDDING_URL/health
   # {"ok":true}
   ```
5. **Re-embed dos chunks** em janela de manutenção (a migration 768→1024 invalida vetores antigos):
   ```bash
   docker compose -f docker-compose.prod.yml exec api php artisan chunks:reembed
   ```
6. **Subir tráfego.** `ai_settings.embedding_provider = 'sidecar'` é o default — sem ação manual.

---

## Onde o código vive

| Camada | Arquivo | Mudança |
|---|---|---|
| Migration | `sabia-api/database/migrations/2026_08_31_030000_add_embedding_provider_to_ai_settings.php` | Coluna `embedding_provider` |
| Migration | `sabia-api/database/migrations/2026_09_01_010000_change_article_chunks_embedding_to_1024.php` | 768→1024 + HNSW |
| Service | `sabia-api/app/Services/EmbeddingService.php` | **novo** — `/embed` + `/embed/batch` + `/health` |
| Service | `sabia-api/app/Services/AIProvider.php` | `embed()` delega ao sidecar primeiro |
| Service | `sabia-api/app/Services/ArticleChunkService.php` | `process()` usa batch com fallback |
| Command | `sabia-api/app/Console/Commands/ReembedArticles.php` | **novo** — `php artisan chunks:reembed` |
| Config | `sabia-api/config/services.php` | bloco `embedding.url` |
| Routes | `sabia-api/routes/api.php` | 2 rotas admin novas |
| Frontend | `sabia-frontend/src/pages/admin/settings/AISettings.tsx` | seletor + botão "Testar embedding" |
| Frontend | `sabia-frontend/src/types/index.ts` | `EmbeddingProvider` + campos novos |
| Sidecar | `embedding-sidecar/{main.py,requirements.txt,Dockerfile,.dockerignore}` | **novo** |
| Compose | `docker-compose.{dev,prod}.yml` | serviço `embedding-sidecar` + `EMBEDDING_URL` |

---

## Testes

```bash
# Backend
docker compose -f docker-compose.dev.yml exec api composer test

# Frontend
cd sabia-frontend && npm run lint
```

Testes relevantes:
- `tests/Feature/EmbeddingServiceTest.php` — chamadas HTTP, timeout, fallback para `[]`.
- `tests/Feature/RagTest.php` — criação de artigo usa `/embed/batch` e gera chunks 1024-dim.

---

## Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| `embedding_sidecar_connected: false` no admin | `EMBEDDING_URL` errado ou sidecar fora | `docker compose ps embedding-sidecar` + `curl $EMBEDDING_URL/health` |
| Busca RAG devolve ruído após deploy | `chunks:reembed` não rodou | `php artisan chunks:reembed` |
| Timeout em `/admin/settings/ai/test-embed` | Sidecar em startup (carregando modelo) | Aguardar ~30s e re-tentar |
| `dimensions: 768` no test-embed | `ai_settings.embedding_provider` ≠ `sidecar` | Mudar no painel ou `php artisan tinker` |
| pgvector: `type "vector" does not exist` | Extensão `vector` não habilitada | `CREATE EXTENSION IF NOT EXISTS vector` no DB |
