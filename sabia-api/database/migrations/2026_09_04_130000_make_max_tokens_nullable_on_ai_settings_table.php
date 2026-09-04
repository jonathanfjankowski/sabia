<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            // null = não enviar max_tokens ao provedor (usa o padrão do
            // modelo) — necessário para modelos de raciocínio que estouram
            // orçamentos pequenos.
            $table->unsignedInteger('max_tokens')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            $table->unsignedInteger('max_tokens')->nullable(false)->change();
        });
    }
};
