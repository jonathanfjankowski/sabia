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
        Schema::create('conversations', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('user_id')->nullable()->constrained('profiles')->onDelete('set null');
            $table->string('session_id')->nullable();
            $table->enum('source', ['direct', 'widget', 'kb'])->default('direct');
            $table->enum('access_level', ['public', 'internal'])->default('internal');
            $table->string('title')->nullable();
            $table->boolean('is_closed')->default(false);
            $table->timestampTz('closed_at')->nullable();
            $table->smallInteger('rating')->nullable()->checkBetween(1, 5);
            $table->enum('transfer_status', ['transferred', 'out_of_hours', 'no_answer'])->nullable();
            $table->timestampsTz();
        });
        
        // Add indexes
        Schema::table('conversations', function (Blueprint $table) {
            $table->index('user_id');
            $table->index('session_id');
            $table->index('source');
            $table->index('access_level');
            $table->index('is_closed');
            $table->index('rating');
            $table->index('transfer_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};