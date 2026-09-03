<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
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
            $table->foreignUuid('updated_by')->nullable()->constrained('profiles')->onDelete('set null');
            $table->timestampsTz();
        });

        // Add indexes
        Schema::table('brand_settings', function (Blueprint $table) {
            $table->index('updated_by');
        });

        // Insert default record
        DB::table('brand_settings')->insert([
            'app_name' => 'Sabiá',
            'logo_url' => null,
            'favicon_url' => null,
            'primary_color' => '#6366f1',
            'secondary_color' => '#4f46e5',
            'font' => 'Inter',
            'updated_by' => null,
            'created_at' => new DateTime,
            'updated_at' => new DateTime,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('brand_settings');
    }
};
