<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Executar as migrations.
     * 
     * Cria todas as tabelas necessárias para o Sabiá v3.0
     */
    public function up(): void
    {
        // Tabela de usuários (admins e operadores)
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('role', ['admin', 'operator'])->default('operator');
            $table->rememberToken();
            $table->timestamps();
        });

        // Tabela de categorias para organização de artigos
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->onDelete('cascade');
            $table->integer('order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // Tabela de artigos da base de conhecimento
        Schema::create('knowledge_base_articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('content'); // Conteúdo em markdown
            $table->text('summary')->nullable();
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->foreignId('author_id')->constrained('users')->onDelete('set null');
            $table->json('tags')->nullable(); // Array de tags
            $table->boolean('published')->default(false);
            $table->integer('views')->default(0);
            $table->decimal('average_rating', 3, 2)->default(0);
            $table->timestamps();
            
            // Índice para busca full-text
            $table->fullText(['title', 'content']);
        });

        // Tabela de sessões de chat
        Schema::create('chat_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('visitor_id')->nullable(); // Para usuários não autenticados
            $table->string('source')->default('web'); // web, widget, api
            $table->ipAddress('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();
            
            $table->index(['session_id', 'created_at']);
        });

        // Tabela de mensagens do chat
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_session_id')->constrained()->onDelete('cascade');
            $table->enum('role', ['user', 'assistant', 'system']);
            $table->text('content');
            $table->json('metadata')->nullable(); // Dados adicionais como contexto usado
            $table->decimal('confidence_score', 5, 4)->nullable(); // Score de confiança da IA
            $table->timestamps();
            
            $table->index(['chat_session_id', 'created_at']);
        });

        // Tabela de embeddings para busca semântica (pgvector)
        Schema::create('embeddings', function (Blueprint $table) {
            $table->id();
            $table->morphs('embeddable'); // Polimórfico: article, message, etc.
            $table->string('model'); // Modelo usado para gerar embedding
            $table->vector('embedding', 768); // Vetor de 768 dimensões (configurável)
            $table->text('chunk_text'); // Texto original do chunk
            $table->integer('chunk_index')->default(0);
            $table->timestamps();
            
            // Índice para similaridade de cosseno
            $table->index('embedding');
        });

        // Tabela de configurações do widget
        Schema::create('widget_configs', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->json('config'); // Configurações em JSON
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // Tabela de avaliações/feedback
        Schema::create('feedback_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_message_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('knowledge_base_article_id')->nullable()->constrained()->onDelete('set null');
            $table->integer('rating'); // 1-5 estrelas
            $table->text('comment')->nullable();
            $table->string('session_id')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->timestamps();
            
            $table->check('rating >= 1 AND rating <= 5');
        });

        // Tabela de logs de auditoria
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('action'); // create, update, delete, login, etc.
            $table->string('model_type')->nullable();
            $table->unsignedBigInteger('model_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
            
            $table->index(['model_type', 'model_id']);
            $table->index(['user_id', 'created_at']);
        });

        // Tabela de configurações do sistema
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string'); // string, boolean, json, number
            $table->string('group')->default('general'); // Para agrupar configurações
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Inserir configurações padrão
        DB::table('system_settings')->insert([
            ['key' => 'ai_provider', 'value' => 'gemini', 'type' => 'string', 'group' => 'ai', 'description' => 'Provedor de IA padrão'],
            ['key' => 'widget_enabled', 'value' => 'true', 'type' => 'boolean', 'group' => 'widget', 'description' => 'Widget habilitado'],
            ['key' => 'max_context_messages', 'value' => '10', 'type' => 'number', 'group' => 'ai', 'description' => 'Máximo de mensagens no contexto'],
        ]);
    }

    /**
     * Reverter as migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('feedback_ratings');
        Schema::dropIfExists('widget_configs');
        Schema::dropIfExists('embeddings');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_sessions');
        Schema::dropIfExists('knowledge_base_articles');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('users');
    }
};
