<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('widget_settings', function (Blueprint $table) {
            $table->id();
            $table->text('welcome_message')->default('Olá! Como posso ajudar?');
            $table->string('support_link')->nullable();
            $table->time('support_start_time')->default('08:00');
            $table->time('support_end_time')->default('18:00');
            $table->string('support_phone')->nullable();
            $table->string('teams_webhook_url')->nullable();
            $table->text('out_of_hours_message')->default('Nosso suporte humano funciona das 8h às 18h.');
            $table->text('maintenance_message')->default('O sistema está em manutenção. Tente novamente em breve.');
            $table->jsonb('allowed_domains')->nullable();
            $table->boolean('maintenance_mode')->default(false);
            $table->boolean('teams_notify_transfer')->default(true);
            $table->boolean('teams_notify_gap')->default(true);
            $table->boolean('teams_notify_out_of_hours')->default(true);
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        // Default settings
        DB::table('widget_settings')->insert([
            'welcome_message' => 'Olá! Sou o Sabiá, assistente virtual da Bsoft TMS. Como posso ajudar?',
            'support_start_time' => '08:00',
            'support_end_time' => '18:00',
            'out_of_hours_message' => 'Nosso suporte humano funciona das 8h às 18h. Deixe sua mensagem que retornaremos em horário comercial.',
            'maintenance_message' => 'O sistema está em manutenção. Tente novamente em breve.',
            'allowed_domains' => json_encode(['*']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('widget_settings');
    }
};
