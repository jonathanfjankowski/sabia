<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('article_chunks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained()->onDelete('cascade');
            $table->text('content');
            $table->integer('chunk_index')->default(0);
            // Embedding vector - em PostgreSQL com pgvector usar:
            // $table->vector('embedding', 768)->nullable();
            // Para compatibilidade, usamos jsonb
            $table->jsonb('embedding')->nullable();
            $table->jsonb('keywords')->nullable();
            $table->timestamps();

            $table->index('article_id');
            $table->index('chunk_index');
        });

        // Nota: Em produção com PostgreSQL + pgvector, execute:
        // DB::statement('CREATE INDEX idx_chunks_embedding ON article_chunks USING HNSW (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);');
    }

    public function down(): void
    {
        Schema::dropIfExists('article_chunks');
    }
};
