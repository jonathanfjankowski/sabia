<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * O SystemLogService registra eventos vindos de todos os contextos —
     * inclusive chat e settings do widget, que rodam sob SET ROLE
     * sabia_widget. Esse role tinha só SELECT em system_logs: cada log do
     * widget falhava com "permission denied" e o evento se perdia (o
     * serviço degrada para laravel.log). Policies RLS seguem válidas:
     * o widget continua sem poder LER logs (só o admin_all_system_logs
     * do sabia_bypass lê).
     */
    public function up(): void
    {
        DB::statement('GRANT INSERT ON system_logs TO sabia_widget');

        // system_logs usa PK serial — INSERT exige a sequence
        DB::statement('GRANT USAGE, SELECT ON SEQUENCE system_logs_id_seq TO sabia_widget');

        // INSERT ... RETURNING id (todo save() do Eloquent no Postgres) exige
        // que a nova linha seja visível por uma policy de SELECT do role.
        DB::statement(
            'CREATE POLICY widget_insert_system_logs ON system_logs FOR INSERT TO sabia_widget WITH CHECK (true)'
        );
        DB::statement(
            'CREATE POLICY widget_select_system_logs ON system_logs FOR SELECT TO sabia_widget USING (true)'
        );
    }

    public function down(): void
    {
        DB::statement('DROP POLICY IF EXISTS widget_insert_system_logs ON system_logs');
        DB::statement('DROP POLICY IF EXISTS widget_select_system_logs ON system_logs');
        DB::statement('REVOKE INSERT ON system_logs FROM sabia_widget');
        DB::statement('REVOKE ALL ON SEQUENCE system_logs_id_seq FROM sabia_widget');
    }
};
