<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->string('access_level')->default('internal')->after('content');
        });

        // Atualizar artigos existentes para internal
        DB::table('articles')->whereNull('access_level')->update(['access_level' => 'internal']);
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn('access_level');
        });
    }
};
