<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Executa as migrations.
     */
    public function up(): void
    {
        // Tabela de configurações da empresa (branding, white label)
        Schema::create('company_settings', function (Blueprint $table) {
            $table->id();
            $table->string('company_name')->default('Bsoft TMS');
            $table->string('logo_url')->nullable();
            $table->string('primary_color')->default('#3B82F6');
            $table->string('secondary_color')->default('#1E40AF');
            $table->text('welcome_message')->nullable();
            $table->jsonb('contact_info')->nullable(); // { email, phone, address }
            $table->boolean('enable_evaluations')->default(true);
            $table->boolean('enable_audit_logs')->default(true);
            $table->timestamps();
        });

        // Tabela de categorias para artigos da base de conhecimento
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->onDelete('cascade');
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Tabela de artigos da base de conhecimento
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('summary')->nullable();
            $table->longText('content'); // Markdown
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->foreignId('author_id')->constrained('users')->onDelete('set null');
            $table->jsonb('tags')->nullable(); // Array de tags
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->integer('views_count')->default(0);
            $table->decimal('avg_rating', 3, 2)->default(0); // 0.00 a 5.00
            $table->integer('rating_count')->default(0);
            
            // Campos para embedding vectorial (pgvector) - armazenado como JSON no SQLite para desenvolvimento
            // Em produção com PostgreSQL, usar: $table->vector('content_embedding', 768)->nullable();
            $table->jsonb('content_embedding')->nullable(); // Array de floats com 768 dimensões
            
            $table->timestamps();
            $table->softDeletes();
        });

        // Índice para busca vetorial (apenas em PostgreSQL com pgvector)
        // DB::statement('CREATE INDEX articles_content_embedding_idx ON articles USING ivfflat (content_embedding vector_cosine_ops)');

        // Tabela de configurações de IA
        Schema::create('ai_settings', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->default('gemini'); // gemini, openai, anthropic
            $table->string('model')->default('gemini-1.5-flash');
            $table->text('api_key')->nullable();
            $table->text('system_prompt')->nullable();
            $table->integer('max_tokens')->default(1024);
            $table->decimal('temperature', 3, 2)->default(0.7);
            $table->integer('top_k')->default(3); // Quantidade de chunks para RAG
            $table->decimal('confidence_threshold', 3, 2)->default(0.75); // 0.00 a 1.00
            $table->boolean('enable_rag')->default(true);
            $table->boolean('enable_citations')->default(true);
            $table->jsonb('fallback_providers')->nullable(); // [{ provider, model, api_key }]
            $table->timestamps();
        });

        // Tabela de conversas (sessões de chat)
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id')->unique(); // ID para o widget/frontend
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('title')->nullable(); // Título da conversa (para editor de texto)
            $table->string('model')->nullable(); // Modelo de IA selecionado
            $table->text('system_prompt')->nullable(); // Prompt personalizado do sistema
            $table->string('access_level')->default('public'); // public, internal
            $table->string('source')->default('widget'); // widget, kb, direct
            $table->ipAddress('user_ip')->nullable();
            $table->text('user_agent')->nullable();
            $table->jsonb('metadata')->nullable(); // Informações adicionais
            $table->timestamp('last_activity_at')->useCurrent();
            $table->timestamps();
        });

        // Tabela de mensagens
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->onDelete('cascade');
            $table->enum('role', ['user', 'assistant', 'system']);
            $table->text('content');
            $table->jsonb('citations')->nullable(); // [{ article_id, title, excerpt, score }]
            $table->decimal('confidence_score', 3, 2)->nullable(); // 0.00 a 1.00
            $table->boolean('is_flagged')->default(false); // Para moderação
            $table->text('flag_reason')->nullable();
            $table->timestamps();
        });

        // Tabela de avaliações de respostas
        Schema::create('evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->integer('rating'); // 1 a 5
            $table->text('feedback')->nullable();
            $table->enum('sentiment', ['positive', 'neutral', 'negative'])->default('neutral');
            $table->timestamps();
        });

        // Tabela de logs de auditoria
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('action'); // create, update, delete, login, etc.
            $table->string('entity_type'); // Article, User, Setting, etc.
            $table->bigInteger('entity_id');
            $table->jsonb('old_values')->nullable();
            $table->jsonb('new_values')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
        });

        // Tabela de logs de interações com IA
        Schema::create('ai_interaction_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->onDelete('cascade');
            $table->foreignId('message_id')->nullable()->constrained()->onDelete('set null');
            $table->string('event_type'); // prompt_sent, response_received, error, fallback_used
            $table->text('prompt')->nullable();
            $table->text('response')->nullable();
            $table->integer('tokens_used')->nullable();
            $table->decimal('latency_ms', 10, 2)->nullable();
            $table->string('error_message')->nullable();
            $table->jsonb('context')->nullable(); // Contexto enviado para IA
            $table->timestamps();
        });

        // Inserir configuração padrão de IA
        DB::table('ai_settings')->insert([
            'provider' => 'gemini',
            'model' => 'gemini-1.5-flash',
            'system_prompt' => "Você é o Sabiá, assistente virtual inteligente da Bsoft TMS. 
Seu objetivo é ajudar usuários com dúvidas sobre o sistema TMS de forma clara, objetiva e amigável.
Sempre que possível, baseie suas respostas na base de conhecimento disponível.
Se não tiver certeza ou a confiança for baixa, seja honesto e sugira contato com suporte humano.
Mantenha um tom profissional mas acessível.",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Inserir configurações padrão da empresa
        DB::table('company_settings')->insert([
            'company_name' => 'Bsoft TMS',
            'primary_color' => '#3B82F6',
            'secondary_color' => '#1E40AF',
            'welcome_message' => 'Olá! Sou o Sabiá, seu assistente virtual. Como posso ajudar você hoje?',
            'contact_info' => json_encode([
                'email' => 'suporte@bsofttms.com.br',
                'phone' => '(11) 99999-9999',
                'address' => 'São Paulo, SP'
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverte as migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_interaction_logs');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('evaluations');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('ai_settings');
        Schema::dropIfExists('articles');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('company_settings');
    }
};
