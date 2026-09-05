<?php

namespace App\Console\Commands;

use App\Models\Article;
use App\Services\ArticleChunkService;
use Illuminate\Console\Command;

/**
 * Re-embeda todos os artigos que têm chunks.
 *
 * Obrigatório após trocar a dimensão do vetor (768 → 1024, migration
 * 2026_09_01_010000) — os vetores antigos ficam inválidos. Ver
 * docs/arquitetura.md.
 */
class ReembedArticles extends Command
{
    protected $signature = 'chunks:reembed';

    protected $description = 'Regenera embeddings de todos os chunks de artigos existentes';

    public function handle(): int
    {
        $service = app(ArticleChunkService::class);
        $articles = Article::whereHas('chunks')->cursor();

        $count = Article::whereHas('chunks')->count();
        if ($count === 0) {
            $this->info('Nenhum artigo com chunks para re-embedar.');

            return self::SUCCESS;
        }

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        foreach ($articles as $article) {
            $service->process($article);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("{$count} artigo(s) re-embedado(s).");

        return self::SUCCESS;
    }
}
