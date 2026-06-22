<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Executar a migration.
     * 
     * Configura Row Level Security (RLS) no PostgreSQL para isolamento de dados
     */
    public function up(): void
    {
        // Habilitar extensão pgvector se ainda não estiver habilitada
        DB::statement('CREATE EXTENSION IF NOT EXISTS vector;');

        // Criar roles se não existirem
        DB::statement("DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sabia_internal') THEN
                CREATE ROLE sabia_internal NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION LOGIN PASSWORD 'internal_pass';
            END IF;
            
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sabia_public') THEN
                CREATE ROLE sabia_public NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION LOGIN PASSWORD 'public_pass';
            END IF;
        END
        \$\$;");

        // Conceder permissões básicas
        DB::statement('GRANT CONNECT ON DATABASE sabia_db TO sabia_internal;');
        DB::statement('GRANT CONNECT ON DATABASE sabia_db TO sabia_public;');
        DB::statement('GRANT USAGE ON SCHEMA public TO sabia_internal;');
        DB::statement('GRANT USAGE ON SCHEMA public TO sabia_public;');

        // Habilitar RLS nas tabelas principais
        $tables = [
            'knowledge_base_articles',
            'chat_sessions',
            'chat_messages',
            'embeddings',
            'feedback_ratings',
        ];

        foreach ($tables as $table) {
            // Habilitar RLS
            DB::statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY;");

            // Política para admins e operadores (acesso total)
            DB::statement("
                CREATE POLICY \"{$table}_internal_policy\" ON {$table}
                FOR ALL
                TO sabia_internal
                USING (true)
                WITH CHECK (true);
            ");

            // Política para público (apenas artigos publicados)
            if ($table === 'knowledge_base_articles') {
                DB::statement("
                    CREATE POLICY \"{$table}_public_policy\" ON {$table}
                    FOR SELECT
                    TO sabia_public
                    USING (published = true);
                ");
            }
        }

        // Políticas específicas para chat_sessions
        DB::statement("
            CREATE POLICY chat_sessions_public_policy ON chat_sessions
            FOR INSERT
            TO sabia_public
            WITH CHECK (true);
        ");

        // Políticas específicas para chat_messages
        DB::statement("
            CREATE POLICY chat_messages_public_policy ON chat_messages
            FOR INSERT
            TO sabia_public
            WITH CHECK (true);
        ");

        // Criar função para gerar embeddings automaticamente
        DB::statement("
            CREATE OR REPLACE FUNCTION generate_embedding_for_article()
            RETURNS TRIGGER AS \$\$
            BEGIN
                -- Aqui seria chamada a API de embedding
                -- Por enquanto, apenas registra o trigger
                RETURN NEW;
            END;
            \$\$ LANGUAGE plpgsql;
        ");

        // Criar trigger para gerar embeddings ao inserir/atualizar artigos
        DB::statement("
            CREATE TRIGGER trigger_generate_article_embedding
            AFTER INSERT OR UPDATE ON knowledge_base_articles
            FOR EACH ROW
            EXECUTE FUNCTION generate_embedding_for_article();
        ");
    }

    /**
     * Reverter a migration.
     */
    public function down(): void
    {
        // Remover triggers
        DB::statement('DROP TRIGGER IF EXISTS trigger_generate_article_embedding ON knowledge_base_articles;');
        DB::statement('DROP FUNCTION IF EXISTS generate_embedding_for_article();');

        // Remover políticas de RLS
        $tables = [
            'knowledge_base_articles',
            'chat_sessions',
            'chat_messages',
            'embeddings',
            'feedback_ratings',
        ];

        foreach ($tables as $table) {
            DB::statement("DROP POLICY IF EXISTS {$table}_internal_policy ON {$table};");
            DB::statement("DROP POLICY IF EXISTS {$table}_public_policy ON {$table};");
            
            // Desabilitar RLS
            DB::statement("ALTER TABLE {$table} DISABLE ROW LEVEL SECURITY;");
        }

        // Remover roles
        DB::statement('REVOKE ALL PRIVILEGES ON DATABASE sabia_db FROM sabia_public;');
        DB::statement('REVOKE ALL PRIVILEGES ON DATABASE sabia_db FROM sabia_internal;');
        DB::statement('DROP ROLE IF EXISTS sabia_public;');
        DB::statement('DROP ROLE IF EXISTS sabia_internal;');
    }
};
