<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('widget_settings', function (Blueprint $table) {
            $table->id();
            $table->text('welcome_message')->default('Olá! Como posso ajudar?');
            $table->text('support_link')->nullable();
            $table->time('support_start_time')->default('08:00:00');
            $table->time('support_end_time')->default('18:00:00');
            $table->string('support_phone')->nullable();
            $table->text('teams_webhook_url')->nullable();
            $table->text('out_of_hours_message')->default('Nosso suporte humano funciona das 8h às 18h.');
            $table->boolean('teams_notify_transfer')->default(true);
            $table->boolean('teams_notify_gap')->default(true);
            $table->boolean('teams_notify_out_of_hours')->default(true);
            $table->json('allowed_domains')->nullable(); // TEXT[] maps to JSON
            $table->boolean('maintenance_mode')->default(false);
            $table->text('maintenance_message')->default('O sistema está em manutenção. Tente novamente em breve.');
            $table->foreignUuid('updated_by')->nullable()->constrained('profiles')->onDelete('set null');
            $table->timestampsTz();
        });
        
        // Add indexes
        Schema::table('widget_settings', function (Blueprint $table) {
            $table->index('updated_by');
        });
        
        // Insert default record
        DB::table('widget_settings')->insert([
            'welcome_message' => 'Olá! 👋 Sou o Sabiá, seu assistente de suporte. Como posso ajudar?',
            'support_link' => null,
            'support_start_time' => '08:00:00',
            'support_end_time' => '18:00:00',
            'support_phone' => null,
            'teams_webhook_url' => null,
            'out_of_hours_message' => 'Nosso suporte humano funciona das 8h às 18h.',
            'teams_notify_transfer' => true,
            'teams_notify_gap' => true,
            'teams_notify_out_of_hours' => true,
            'allowed_domains' => json_encode([]),
            'maintenance_mode' => false,
            'maintenance_message' => 'O sistema está em manutenção. Tente novamente em breve.',
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
        Schema::dropIfExists('widget_settings');
    }
};