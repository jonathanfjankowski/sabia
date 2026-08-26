<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            $table->text('endpoint')->nullable()->after('provider');
        });

        // Default OpenAI-compatible endpoint
        DB::table('ai_settings')->whereNull('endpoint')->update([
            'endpoint' => 'https://api.openai.com/v1',
        ]);
    }

    public function down(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            $table->dropColumn('endpoint');
        });
    }
};
