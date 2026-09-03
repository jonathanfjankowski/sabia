<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('article_suggestions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('suggested_by')->constrained('profiles')->onDelete('cascade');
            $table->foreignId('category_id')->nullable()->constrained()->onDelete('set null');
            $table->string('title');
            $table->text('content'); // markdown
            $table->text('summary')->nullable();
            $table->enum('access_level', ['public', 'internal'])->default('internal');
            $table->enum('status', ['pending', 'approved', 'rejected', 'published'])->default('pending');
            $table->foreignUuid('reviewed_by')->nullable()->constrained('profiles')->onDelete('set null');
            $table->text('review_notes')->nullable(); // gestor notes when rejecting/editing
            $table->foreignId('article_id')->nullable()->constrained('articles')->onDelete('set null'); // link to created article when published
            $table->timestamp('reviewed_at')->nullable();
            $table->timestampsTz();

            $table->index(['status', 'suggested_by']);
            $table->index(['status', 'category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_suggestions');
    }
};
