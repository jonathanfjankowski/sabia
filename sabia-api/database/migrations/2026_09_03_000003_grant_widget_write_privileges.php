<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * O widget escreve (cria conversa, salva mensagens, registra gaps, fecha
     * e avalia) mas a migration 2026_08_29_021500 só concedeu SELECT para o
     * role sabia_widget — todo POST /api/widget/* quebrava com
     * "permission denied". As policies RLS continuam limitando as linhas à
     * sessão do chamador; aqui concedemos só o DML que o widget usa.
     *
     * knowledge_gaps também não tinha policy de INSERT para o widget.
     */
    public function up(): void
    {
        DB::statement('GRANT INSERT, UPDATE ON conversations TO sabia_widget');
        DB::statement('GRANT INSERT ON messages TO sabia_widget');
        DB::statement('GRANT INSERT ON knowledge_gaps TO sabia_widget');

        // messages/knowledge_gaps usam PK serial — INSERT exige a sequence
        DB::statement('GRANT USAGE, SELECT ON SEQUENCE messages_id_seq TO sabia_widget');
        DB::statement('GRANT USAGE, SELECT ON SEQUENCE knowledge_gaps_id_seq TO sabia_widget');

        DB::statement(
            "CREATE POLICY widget_insert_gaps ON knowledge_gaps FOR INSERT TO sabia_widget ".
            "WITH CHECK (session_id = current_setting('app.current_session_id', true))"
        );

        // ai_settings não tinha policy para sabia_internal: para o operador a
        // tabela ficava invisível e AiSettings::current() tentava INSERT
        // (negado) — quebrando chat e listagem de artigos para operador.
        // SELECT é seguro: os controllers nunca expõem api_key (máscara).
        DB::statement(
            'CREATE POLICY internal_read_ai_settings ON ai_settings FOR SELECT TO sabia_internal USING (true)'
        );

        // Infraestrutura do Laravel (driver de cache database): requests sob
        // roles RLS leem/escrevem cache — sem GRANT o widget dava 500
        foreach (['cache', 'cache_locks'] as $table) {
            DB::statement("GRANT SELECT, INSERT, UPDATE, DELETE ON {$table} TO sabia_widget");
            DB::statement("GRANT SELECT, INSERT, UPDATE, DELETE ON {$table} TO sabia_internal");
        }

        // Sessions com driver database: requests stateful (SANCTUM_STATEFUL_
        // DOMAINS) iniciam sessão sob o role RLS da rota
        foreach (['sabia_widget', 'sabia_internal'] as $role) {
            DB::statement("GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO {$role}");
        }
    }

    public function down(): void
    {
        DB::statement('DROP POLICY IF EXISTS widget_insert_gaps ON knowledge_gaps');
        DB::statement('DROP POLICY IF EXISTS internal_read_ai_settings ON ai_settings');

        foreach (['cache', 'cache_locks'] as $table) {
            DB::statement("REVOKE ALL ON {$table} FROM sabia_widget");
            DB::statement("REVOKE ALL ON {$table} FROM sabia_internal");
        }
        DB::statement('REVOKE ALL ON sessions FROM sabia_widget');
        DB::statement('REVOKE ALL ON sessions FROM sabia_internal');

        DB::statement('REVOKE INSERT, UPDATE ON conversations FROM sabia_widget');
        DB::statement('REVOKE INSERT ON messages FROM sabia_widget');
        DB::statement('REVOKE INSERT ON knowledge_gaps FROM sabia_widget');
        DB::statement('REVOKE ALL ON SEQUENCE messages_id_seq FROM sabia_widget');
        DB::statement('REVOKE ALL ON SEQUENCE knowledge_gaps_id_seq FROM sabia_widget');
    }
};
