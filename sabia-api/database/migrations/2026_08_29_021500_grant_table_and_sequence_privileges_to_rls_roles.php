<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Concede GRANTs reais (tabela + sequence) aos roles RLS.
     *
     * A migration 2026_08_04_220000 criou os roles e policies mas esqueceu
     * os GRANTs — sem eles, o SET LOCAL ROLE troca para um role sem
     * permissão em tables/sequences e qualquer INSERT/UPDATE/DELETE falha
     * com "permission denied for sequence ..._id_seq".
     *
     * Mesmo com policy USING(true), o PG exige GRANTs reais antes.
     */
    public function up(): void
    {
        // Helper: concede grants padrão em uma tabela + sua PK sequence (se existir)
        $grant = function (string $table, bool $hasSerialPk = true): void {
            DB::statement("GRANT SELECT ON {$table} TO sabia_widget");
            DB::statement("GRANT SELECT, INSERT, UPDATE, DELETE ON {$table} TO sabia_internal");
            DB::statement("GRANT ALL ON {$table} TO sabia_bypass");

            if ($hasSerialPk) {
                $seq = $table.'_id_seq';
                DB::statement("GRANT USAGE, SELECT ON SEQUENCE {$seq} TO sabia_internal");
                DB::statement("GRANT USAGE, SELECT ON SEQUENCE {$seq} TO sabia_bypass");
            }
        };

        // Tabelas com RLS (migration 2026_08_04_220000 + 2026_08_26_025106 + 2026_08_24_041125)
        // Serial PK (têm sequence _id_seq): articles, article_chunks, messages, knowledge_gaps,
        // system_logs, audit_logs, article_versions, categories, widget_settings, brand_settings, ai_settings
        $grant('articles', true);
        $grant('article_chunks', true);
        $grant('messages', true);
        $grant('knowledge_gaps', true);
        $grant('system_logs', true);
        $grant('audit_logs', true);
        $grant('article_versions', true);
        $grant('categories', true);
        $grant('widget_settings', true);
        $grant('brand_settings', true);
        $grant('ai_settings', true);

        // UUID PK (não têm sequence): conversations, profiles, users
        $grant('conversations', false);
        $grant('profiles', false);
        $grant('users', false);
    }

    public function down(): void
    {
        $revoke = function (string $table, bool $hasSerialPk = true): void {
            DB::statement("REVOKE ALL ON {$table} FROM sabia_widget");
            DB::statement("REVOKE ALL ON {$table} FROM sabia_internal");
            DB::statement("REVOKE ALL ON {$table} FROM sabia_bypass");

            if ($hasSerialPk) {
                $seq = $table.'_id_seq';
                DB::statement("REVOKE ALL ON SEQUENCE {$seq} FROM sabia_internal");
                DB::statement("REVOKE ALL ON SEQUENCE {$seq} FROM sabia_bypass");
            }
        };

        $revoke('articles', true);
        $revoke('article_chunks', true);
        $revoke('messages', true);
        $revoke('knowledge_gaps', true);
        $revoke('system_logs', true);
        $revoke('audit_logs', true);
        $revoke('article_versions', true);
        $revoke('categories', true);
        $revoke('widget_settings', true);
        $revoke('brand_settings', true);
        $revoke('ai_settings', true);
        $revoke('conversations', false);
        $revoke('profiles', false);
        $revoke('users', false);
    }
};
