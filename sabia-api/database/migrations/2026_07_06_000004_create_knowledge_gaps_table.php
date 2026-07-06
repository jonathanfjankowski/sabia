<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_gaps', function (Blueprint $table) {
            $table->id();
            $table->text('question');
            $table->text('context')->nullable();
            $table->foreignId('conversation_id')->nullable()->constrained()->onDelete('set null');
            $table->string('session_id')->nullable();
            $table->string('source')->default('direct'); // direct, widget, kb
            $table->boolean('resolved')->default(false);
            $table->foreignId('resolved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('resolved_at')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamps();

            $table->index(['resolved', 'created_at']);
            $table->index('source');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('knowledge_gaps');
    }
};
