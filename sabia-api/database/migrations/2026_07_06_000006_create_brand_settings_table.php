<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brand_settings', function (Blueprint $table) {
            $table->id();
            $table->string('app_name')->default('Sabiá');
            $table->string('logo_url')->nullable();
            $table->string('favicon_url')->nullable();
            $table->string('primary_color')->default('#6366f1');
            $table->string('secondary_color')->default('#4f46e5');
            $table->string('font')->default('Inter');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        DB::table('brand_settings')->insert([
            'app_name' => 'Sabiá',
            'primary_color' => '#6366f1',
            'secondary_color' => '#4f46e5',
            'font' => 'Inter',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_settings');
    }
};
