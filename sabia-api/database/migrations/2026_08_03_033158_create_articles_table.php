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
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('content');
            $table->text('summary')->nullable();
            $table->foreignId('category_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('access_level', ['public', 'internal'])->default('internal');
            $table->enum('status', ['active', 'draft', 'archived'])->default('active');
            $table->integer('views_count')->default(0);
            $table->integer('helpful_yes')->default(0);
            $table->integer('helpful_no')->default(0);
            $table->integer('version')->default(1);
            $table->foreignUuid('created_by')->constrained('profiles');
            $table->timestampsTz();
        });

        // Add indexes for performance
        Schema::table('articles', function (Blueprint $table) {
            $table->index('category_id');
            $table->index('created_by');
            $table->index('access_level');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('articles');
    }
};
