<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('article_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained()->onDelete('cascade');
            $table->integer('version');
            $table->string('title');
            $table->text('summary')->nullable();
            $table->longText('content');
            $table->string('changelog')->nullable();
            $table->foreignId('edited_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->unique(['article_id', 'version']);
            $table->index('article_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_versions');
    }
};
