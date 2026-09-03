<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            // 'sidecar' = servidor Python BAAI/bge-m3 (config/services.php embedding.url).
            // 'openai'/'gemini'/'custom' = endpoint OpenAI-compatível (reusa do chat
            // quando embedding_endpoint está vazio — fallback retrocompatível).
            $table->enum('embedding_provider', ['sidecar', 'openai', 'gemini', 'custom'])
                ->default('sidecar')->after('embedding_model');
            $table->text('embedding_endpoint')->nullable()->after('embedding_model');
            $table->text('embedding_api_key')->nullable()->after('embedding_endpoint');
        });
    }

    public function down(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            $table->dropColumn(['embedding_provider', 'embedding_endpoint', 'embedding_api_key']);
        });
    }
};
