# Embedding Sidecar — Guia de Deploy

Serviço Python leve que expõe uma API de embedding usando o modelo `BAAI/bge-m3`, projetado para rodar no Railway junto ao seu backend Laravel.

---

## Estrutura do projeto

```
embedding-sidecar/
├── Dockerfile
├── requirements.txt
└── main.py
```

---

## Arquivos

### requirements.txt

```
fastapi
uvicorn
sentence-transformers
torch --index-url https://download.pytorch.org/whl/cpu
```

> A versão CPU do torch é essencial — a padrão vem com CUDA e pesa ~2GB desnecessários.

---

### main.py

```python
from fastapi import FastAPI
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel

app = FastAPI()
model = SentenceTransformer("BAAI/bge-m3")

class EmbedRequest(BaseModel):
    text: str

class EmbedBatchRequest(BaseModel):
    texts: list[str]

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/embed")
def embed(req: EmbedRequest):
    vector = model.encode(req.text, normalize_embeddings=True).tolist()
    return {"vector": vector, "dimensions": len(vector)}

@app.post("/embed/batch")
def embed_batch(req: EmbedBatchRequest):
    vectors = model.encode(req.texts, normalize_embeddings=True).tolist()
    return {"vectors": vectors}
```

O endpoint `/embed/batch` é importante para ingestão de múltiplos documentos de uma vez sem fazer uma chamada HTTP por item.

---

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Baixa e cacheia o modelo durante o build, não no startup
RUN python -c "
from sentence_transformers import SentenceTransformer
SentenceTransformer('BAAI/bge-m3')
"

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

> O download do modelo acontece no build (~1GB). Isso evita lentidão no startup e garante que o serviço suba pronto para receber requisições.

---

## Deploy no Railway

1. Suba a pasta `embedding-sidecar` no GitHub (pode ser um repo separado ou subpasta do seu monorepo)
2. No seu projeto Railway, clique em **Add Service → GitHub Repo** e aponte para esse repositório
3. O Railway detecta o Dockerfile automaticamente
4. Aguarde o build — o download do modelo pode levar alguns minutos na primeira vez
5. Nas configurações do serviço, vá em **Networking → Internal** e anote o endereço interno, que será algo como:

```
http://embedding-sidecar.railway.internal:8000
```

Nenhuma variável de ambiente é necessária no sidecar.

---

## Configuração no Laravel

### config/services.php

```php
'embedding' => [
    'url' => env('EMBEDDING_URL', 'http://localhost:8000'),
],
```

### .env (no Railway, no serviço Laravel)

```
EMBEDDING_URL=http://embedding-sidecar.railway.internal:8000
```

---

## EmbeddingService.php

```php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EmbeddingService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.embedding.url');
    }

    public function embed(string $text): array
    {
        $response = Http::timeout(30)->post("{$this->baseUrl}/embed", [
            'text' => $text,
        ]);

        if ($response->failed()) {
            Log::error('Embedding failed', ['text' => substr($text, 0, 100)]);
            throw new \Exception('Embedding service unavailable');
        }

        return $response->json('vector');
    }

    public function embedBatch(array $texts): array
    {
        $response = Http::timeout(60)->post("{$this->baseUrl}/embed/batch", [
            'texts' => $texts,
        ]);

        if ($response->failed()) {
            throw new \Exception('Embedding batch failed');
        }

        return $response->json('vectors');
    }
}
```

---

## Testando o sidecar

Após o deploy, você pode testar direto pelo terminal ou pelo Postman.

### Health check

```bash
curl https://seu-sidecar.railway.app/health
# {"ok": true}
```

### Embed simples

```bash
curl -X POST https://seu-sidecar.railway.app/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "Como funciona o plano de assinatura?"}'
```

### Embed em batch

```bash
curl -X POST https://seu-sidecar.railway.app/embed/batch \
  -H "Content-Type: application/json" \
  -d '{"texts": ["primeiro documento", "segundo documento"]}'
```

---

## Observações importantes

### Memória
O `bge-m3` ocupa ~1.1GB de RAM. Com seu plano de 8GB no Railway, sobra bastante para o Laravel, Postgres e o próprio sistema.

### Rede interna
A comunicação entre o Laravel e o sidecar usa a rede interna do Railway (`*.railway.internal`), o que é mais rápido e não consome banda externa.

### Segurança
O sidecar não tem autenticação por padrão. Como ele só é acessível via rede interna do Railway, isso é aceitável. Se precisar expor publicamente, adicione um middleware de API key no FastAPI.

### Modelo alternativo
Se precisar de algo mais leve (menos RAM, startup mais rápido), substitua `BAAI/bge-m3` por `sentence-transformers/all-MiniLM-L6-v2` (~100MB). A qualidade em português é menor, mas funciona bem para testes.
