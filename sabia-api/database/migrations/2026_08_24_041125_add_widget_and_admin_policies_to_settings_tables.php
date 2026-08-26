<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Garante privilégios básicos nos roles RLS. Postgres GRANTs são
        // separados das policies: sem GRANT, o role nem chega no RLS filter.
        foreach (['widget_settings', 'brand_settings', 'ai_settings', 'audit_logs', 'system_logs'] as $table) {
            DB::statement("GRANT SELECT ON {$table} TO sabia_widget");
            DB::statement("GRANT SELECT, INSERT, UPDATE, DELETE ON {$table} TO sabia_internal");
            DB::statement("GRANT ALL ON {$table} TO sabia_bypass");
        }

        // widget_settings: widget lê (1 row), admin escreve tudo
        DB::statement('ALTER TABLE widget_settings ENABLE ROW LEVEL SECURITY');
        DB::statement('DROP POLICY IF EXISTS widget_read_widget_settings ON widget_settings');
        DB::statement('DROP POLICY IF EXISTS admin_all_widget_settings ON widget_settings');
        DB::statement("CREATE POLICY widget_read_widget_settings ON widget_settings FOR SELECT TO sabia_widget USING (true)");
        DB::statement("CREATE POLICY admin_all_widget_settings ON widget_settings FOR ALL TO sabia_bypass USING (true) WITH CHECK (true)");

        // brand_settings: widget lê (1 row), admin escreve tudo
        DB::statement('ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY');
        DB::statement('DROP POLICY IF EXISTS widget_read_brand_settings ON brand_settings');
        DB::statement('DROP POLICY IF EXISTS admin_all_brand_settings ON brand_settings');
        DB::statement("CREATE POLICY widget_read_brand_settings ON brand_settings FOR SELECT TO sabia_widget USING (true)");
        DB::statement("CREATE POLICY admin_all_brand_settings ON brand_settings FOR ALL TO sabia_bypass USING (true) WITH CHECK (true)");

        // ai_settings: apenas admin (bypass)
        DB::statement('ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY');
        DB::statement('DROP POLICY IF EXISTS admin_all_ai_settings ON ai_settings');
        DB::statement("CREATE POLICY admin_all_ai_settings ON ai_settings FOR ALL TO sabia_bypass USING (true) WITH CHECK (true)");

        // audit_logs + system_logs: apenas admin
        DB::statement('ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY');
        DB::statement('DROP POLICY IF EXISTS admin_all_audit_logs ON audit_logs');
        DB::statement("CREATE POLICY admin_all_audit_logs ON audit_logs FOR ALL TO sabia_bypass USING (true) WITH CHECK (true)");

        DB::statement('ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY');
        DB::statement('DROP POLICY IF EXISTS admin_all_system_logs ON system_logs');
        DB::statement("CREATE POLICY admin_all_system_logs ON system_logs FOR ALL TO sabia_bypass USING (true) WITH CHECK (true)");
    }

    public function down(): void
    {
        DB::statement('DROP POLICY IF EXISTS widget_read_widget_settings ON widget_settings');
        DB::statement('DROP POLICY IF EXISTS admin_all_widget_settings ON widget_settings');
        DB::statement('DROP POLICY IF EXISTS widget_read_brand_settings ON brand_settings');
        DB::statement('DROP POLICY IF EXISTS admin_all_brand_settings ON brand_settings');
        DB::statement('DROP POLICY IF EXISTS admin_all_ai_settings ON ai_settings');
        DB::statement('DROP POLICY IF EXISTS admin_all_audit_logs ON audit_logs');
        DB::statement('DROP POLICY IF EXISTS admin_all_system_logs ON system_logs');
    }
};
