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
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('conversation_id')->constrained()->onDelete('cascade');
            $table->enum('role', ['user', 'assistant', 'system']);
            $table->text('content');
            $table->json('images')->nullable();
            $table->json('sources')->nullable();
            $table->boolean('has_images')->default(false);
            $table->decimal('confidence', 4, 3)->nullable(); // NUMERIC(4,3)
            $table->timestampsTz();
        });

        // Add indexes
        Schema::table('messages', function (Blueprint $table) {
            $table->index('conversation_id');
            $table->index('has_images');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
