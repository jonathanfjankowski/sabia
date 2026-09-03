<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ai_settings: widget lê config básica (sem api_key), admin escreve tudo
        DB::statement('DROP POLICY IF EXISTS widget_read_ai_settings ON ai_settings');
        DB::statement('CREATE POLICY widget_read_ai_settings ON ai_settings FOR SELECT TO sabia_widget USING (true)');
    }

    public function down(): void
    {
        DB::statement('DROP POLICY IF EXISTS widget_read_ai_settings ON ai_settings');
    }
};
