<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * article_chunks.embedding: VECTOR(768) → VECTOR(1024).
 *
 * O provedor padrão de embeddings passa a ser o sidecar local
 * (BAAI/bge-m3, 1024 dims — ver docs/arquitetura.md). O modelo anterior
 * (text-embedding-004) produz 768; os vetores existentes ficam inválidos
 * após a troca — rodar `php artisan chunks:reembed` imediatamente depois.
 *
 * Ordem obrigatória: drop index → alter type → recriar index (pgvector
 * não altera a dimensão com o índice HNSW ativo).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_chunks_embedding');
        DB::statement('ALTER TABLE article_chunks ALTER COLUMN embedding TYPE vector(1024)');
        DB::statement(<<<'SQL'
            CREATE INDEX idx_chunks_embedding ON article_chunks
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 200)
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_chunks_embedding');
        DB::statement('ALTER TABLE article_chunks ALTER COLUMN embedding TYPE vector(768)');
        DB::statement(<<<'SQL'
            CREATE INDEX idx_chunks_embedding ON article_chunks
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 200)
        SQL);
    }
};
