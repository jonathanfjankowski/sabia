<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Enable pgvector extension if not already enabled
        DB::statement('CREATE EXTENSION IF NOT EXISTS vector');

        Schema::create('article_chunks', function (Blueprint $table) {
            $table->id(); // SERIAL PRIMARY KEY
            $table->foreignId('article_id')->constrained()->onDelete('cascade');
            $table->text('content');
            $table->integer('chunk_index')->default(0);
            $table->vector('embedding', 768); // VECTOR(768)
            $table->json('keywords')->nullable(); // TEXT[] in PostgreSQL maps to JSON in Laravel
            $table->timestampsTz();
        });

        // Create HNSW index for vector similarity search
        DB::statement('
            CREATE INDEX idx_chunks_embedding ON article_chunks 
            USING hnsw (embedding vector_cosine_ops) 
            WITH (m = 16, ef_construction = 200)
        ');

        // Additional indexes
        Schema::table('article_chunks', function (Blueprint $table) {
            $table->index('article_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('article_chunks');
        // Note: We don't drop the vector extension as it might be used by other tables
    }
};
