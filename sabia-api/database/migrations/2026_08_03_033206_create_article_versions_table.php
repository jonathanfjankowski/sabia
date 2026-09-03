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
        Schema::create('article_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained()->onDelete('cascade');
            $table->integer('version');
            $table->text('content');
            $table->foreignUuid('edited_by')->nullable()->constrained('profiles');
            $table->timestampsTz();
        });

        // Add indexes for performance
        Schema::table('article_versions', function (Blueprint $table) {
            $table->index('article_id');
            $table->index('edited_by');
            $table->unique(['article_id', 'version']); // Ensure version is unique per article
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('article_versions');
    }
};
