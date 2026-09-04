<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            // Timeout (segundos) que o frontend espera pela resposta da IA;
            // configurável pelo gestor porque proxies/modelos lentos precisam
            // de mais tempo que o padrão.
            $table->unsignedInteger('stream_timeout_seconds')->default(180)->after('max_tokens');
        });
    }

    public function down(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            $table->dropColumn('stream_timeout_seconds');
        });
    }
};
