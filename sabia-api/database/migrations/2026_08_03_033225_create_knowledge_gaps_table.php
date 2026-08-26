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
        Schema::create('knowledge_gaps', function (Blueprint $table) {
            $table->id();
            $table->text('question');
            $table->foreignUuid('conversation_id')->nullable()->constrained()->onDelete('set null');
            $table->string('session_id')->nullable();
            $table->boolean('resolved')->default(false);
            $table->boolean('teams_notified')->default(false);
            $table->foreignUuid('resolved_by')->nullable()->constrained('profiles')->onDelete('set null');
            $table->timestampTz('resolved_at')->nullable();
            $table->timestampsTz();
        });
        
        // Add indexes
        Schema::table('knowledge_gaps', function (Blueprint $table) {
            $table->index('conversation_id');
            $table->index('session_id');
            $table->index('resolved');
            $table->index('resolved_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('knowledge_gaps');
    }
};