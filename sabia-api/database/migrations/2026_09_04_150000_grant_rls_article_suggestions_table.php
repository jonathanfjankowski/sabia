<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * A tabela article_suggestions foi criada sem policies RLS e sem GRANTs
     * para os roles de contexto — toda operação (INSERT do operador, SELECT
     * do gestor via bypass) falhava com "permission denied" (42501).
     *
     * Padrão de acesso:
     * - sabia_internal (operador): insere/lê/edita APENAS as próprias
     *   sugestões (suggested_by = app.current_user_id);
     * - sabia_bypass (gestor): acesso completo para revisão/publicação;
     * - sabia_widget: sem acesso (sugestão é funcionalidade interna).
     */
    public function up(): void
    {
        // A tabela foi criada sem RLS (relrowsecurity = f), ao contrário das
        // demais — policies sem ENABLE não têm efeito
        DB::statement('ALTER TABLE article_suggestions ENABLE ROW LEVEL SECURITY');

        DB::statement('GRANT SELECT, INSERT, UPDATE ON article_suggestions TO sabia_internal');
        DB::statement('GRANT ALL ON article_suggestions TO sabia_bypass');

        DB::statement(
            "CREATE POLICY internal_insert_suggestions ON article_suggestions ".
            "FOR INSERT TO sabia_internal ".
            "WITH CHECK (suggested_by = current_setting('app.current_user_id', true)::uuid)"
        );

        DB::statement(
            "CREATE POLICY internal_read_own_suggestions ON article_suggestions ".
            "FOR SELECT TO sabia_internal ".
            "USING (suggested_by = current_setting('app.current_user_id', true)::uuid)"
        );

        DB::statement(
            "CREATE POLICY internal_update_own_suggestions ON article_suggestions ".
            "FOR UPDATE TO sabia_internal ".
            "USING (suggested_by = current_setting('app.current_user_id', true)::uuid) ".
            "WITH CHECK (suggested_by = current_setting('app.current_user_id', true)::uuid)"
        );

        DB::statement(
            'CREATE POLICY admin_all_suggestions ON article_suggestions '.
            'FOR ALL TO sabia_bypass USING (true) WITH CHECK (true)'
        );
    }

    public function down(): void
    {
        DB::statement('DROP POLICY IF EXISTS internal_insert_suggestions ON article_suggestions');
        DB::statement('DROP POLICY IF EXISTS internal_read_own_suggestions ON article_suggestions');
        DB::statement('DROP POLICY IF EXISTS internal_update_own_suggestions ON article_suggestions');
        DB::statement('DROP POLICY IF EXISTS admin_all_suggestions ON article_suggestions');

        DB::statement('REVOKE SELECT, INSERT, UPDATE ON article_suggestions FROM sabia_internal');
        DB::statement('REVOKE ALL ON article_suggestions FROM sabia_bypass');

        DB::statement('ALTER TABLE article_suggestions DISABLE ROW LEVEL SECURITY');
    }
};
