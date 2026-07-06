<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Nota: Em PostgreSQL, execute estes comandos manualmente ou via DB::statement
        // Os índices GIN e HNSW são específicos do PostgreSQL e não funcionam em SQLite

        // --- GIN index para full-text search em artigos ---
        // DB::statement("
        //   CREATE INDEX IF NOT EXISTS idx_articles_fts
        //   ON articles USING GIN (to_tsvector('portuguese', title || ' ' || COALESCE(summary, '')))
        // ");

        // --- HNSW index para busca vetorial em article_chunks ---
        // DB::statement("
        //   CREATE INDEX IF NOT EXISTS idx_chunks_hnsw
        //   ON article_chunks USING HNSW (embedding vector_cosine_ops)
        //   WITH (m = 16, ef_construction = 200)
        // ");

        // Adicionar coluna para API key criptografada (AES-256)
        Schema::table('ai_settings', function (Blueprint $table) {
            $table->text('encrypted_api_key')->nullable()->after('api_key');
            $table->string('embedding_model')->nullable()->after('model');
            $table->integer('rag_top_n')->default(5)->after('top_k');
            $table->string('language')->default('pt-BR')->after('rag_top_n');
        });

        // Adicionar colunas extras no articles
        Schema::table('articles', function (Blueprint $table) {
            $table->integer('version')->default(1)->after('content');
        });

        // Adicionar imagem support no messages
        Schema::table('messages', function (Blueprint $table) {
            $table->jsonb('images')->nullable()->after('content');
            $table->boolean('has_images')->default(false)->after('images');
        });
    }

    public function down(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            $table->dropColumn(['encrypted_api_key', 'embedding_model', 'rag_top_n', 'language']);
        });
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn('version');
        });
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['images', 'has_images']);
        });
    }
};
