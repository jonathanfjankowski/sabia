"""Embedding sidecar — API de embeddings BAAI/bge-m3 (1024 dims).

Ver EMBEDDING_SIDECAR.md na raiz do repo para arquitetura e deploy.
"""

import os

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, field_validator
from sentence_transformers import SentenceTransformer

app = FastAPI(title="embedding-sidecar")
# Carregado no import: o Dockerfile já baixou o modelo no build,
# então o startup é rápido.
model = SentenceTransformer("BAAI/bge-m3")

MAX_TEXT_CHARS = 32_000
MAX_BATCH_ITEMS = 64

# Token compartilhado opcional (env EMBEDDING_SIDECAR_TOKEN). Quando
# definido, /embed* exige `Authorization: Bearer <token>`.
API_TOKEN = os.environ.get("EMBEDDING_SIDECAR_TOKEN")


def require_token(authorization: str | None = Header(default=None)) -> None:
    if API_TOKEN and authorization != f"Bearer {API_TOKEN}":
        raise HTTPException(status_code=401, detail="unauthorized")


class EmbedRequest(BaseModel):
    text: str = Field(max_length=MAX_TEXT_CHARS)


class EmbedBatchRequest(BaseModel):
    texts: list[str] = Field(max_length=MAX_BATCH_ITEMS)

    @field_validator("texts")
    @classmethod
    def limit_each_text(cls, texts: list[str]) -> list[str]:
        for t in texts:
            if len(t) > MAX_TEXT_CHARS:
                raise ValueError(f"each text must be <= {MAX_TEXT_CHARS} chars")
        return texts


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/embed", dependencies=[Depends(require_token)])
def embed(req: EmbedRequest):
    vector = model.encode(req.text, normalize_embeddings=True).tolist()
    return {"vector": vector, "dimensions": len(vector)}


@app.post("/embed/batch", dependencies=[Depends(require_token)])
def embed_batch(req: EmbedBatchRequest):
    vectors = model.encode(req.texts, normalize_embeddings=True).tolist()
    return {"vectors": vectors}
