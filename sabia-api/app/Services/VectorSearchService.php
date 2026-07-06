<?php

namespace App\Services;

use App\Models\ArticleChunk;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class VectorSearchService
{
    protected EmbeddingService $embeddingService;
    protected int $topN = 5;

    public function __construct(EmbeddingService $embeddingService)
    {
        $this->embeddingService = $embeddingService;
    }

    /**
     * Busca semântica na base de conhecimento
     * Usa similaridade coseno entre embeddings dos chunks
     *
     * @param string $query Texto da busca
     * @param int|null $topN Número de resultados
     * @param string|null $accessLevel Filtro de acesso (public/internal)
     * @return Collection
     */
    public function search(string $query, ?int $topN = null, ?string $accessLevel = null): Collection
    {
        $topN = $topN ?? $this->topN;

        // 1. Gerar embedding da query
        $queryEmbedding = $this->embeddingService->generateEmbedding($query);

        // 2. Buscar chunks com similaridade coseno (em memória para desenvolvimento)
        // Em produção com PostgreSQL + pgvector, usar:
        // DB::select("
        //   SELECT ac.*, a.title as article_title, a.slug as article_slug,
        //          1 - (ac.embedding <=> ?) as similarity
        //   FROM article_chunks ac
        //   JOIN articles a ON a.id = ac.article_id AND a.deleted_at IS NULL
        //   WHERE a.is_published = true
        //   ORDER BY ac.embedding <=> ?
        //   LIMIT ?
        // ", [json_encode($queryEmbedding), json_encode($queryEmbedding), $topN]);

        $chunks = ArticleChunk::whereHas('article', function ($q) use ($accessLevel) {
                $q->where('is_published', true)
                  ->whereNull('deleted_at');

                if ($accessLevel) {
                    // Nota: access_level será implementado quando a coluna for adicionada
                }
            })
            ->with('article:id,title,slug,summary')
            ->get();

        // 3. Calcular similaridade em memória
        $scored = $chunks->map(function ($chunk) use ($queryEmbedding, $query) {
            $embedding = $chunk->embedding ?? [];

            if (!empty($embedding)) {
                $similarity = EmbeddingService::cosineSimilarity($queryEmbedding, $embedding);
            } else {
                // Fallback: similaridade textual
                $similarity = $this->textSimilarity($query, $chunk->content);
            }

            return [
                'chunk_id' => $chunk->id,
                'article_id' => $chunk->article_id,
                'article_title' => $chunk->article->title ?? '',
                'article_slug' => $chunk->article->slug ?? '',
                'content' => $this->truncate($chunk->content, 300),
                'similarity' => round(max(0, $similarity), 4),
                'chunk_index' => $chunk->chunk_index,
            ];
        });

        // 4. Ordenar e limitar
        return $scored->sortByDesc('similarity')
            ->filter(fn($item) => $item['similarity'] > 0.1)
            ->take($topN)
            ->values();
    }

    /**
     * Busca textual (keyword matching) como fallback
     */
    public function textSearch(string $query, int $topN = 10): Collection
    {
        $terms = explode(' ', $query);
        $terms = array_filter($terms, fn($t) => mb_strlen($t) > 2);

        $chunks = ArticleChunk::whereHas('article', function ($q) {
                $q->where('is_published', true)->whereNull('deleted_at');
            })
            ->with('article:id,title,slug,summary')
            ->get();

        $scored = $chunks->map(function ($chunk) use ($terms, $query) {
            $score = 0;
            $content = mb_strtolower($chunk->content);
            $title = mb_strtolower($chunk->article->title ?? '');

            foreach ($terms as $term) {
                $term = mb_strtolower($term);
                $contentCount = mb_substr_count($content, $term);
                $titleCount = mb_substr_count($title, $term);

                $score += $contentCount * 0.5 + $titleCount * 2;
            }

            $score += $this->textSimilarity($query, $chunk->content) * 2;

            return [
                'chunk_id' => $chunk->id,
                'article_id' => $chunk->article_id,
                'article_title' => $chunk->article->title ?? '',
                'article_slug' => $chunk->article->slug ?? '',
                'content' => $this->truncate($chunk->content, 300),
                'similarity' => round(min(1, $score / 10), 4),
                'chunk_index' => $chunk->chunk_index,
            ];
        });

        return $scored->sortByDesc('similarity')
            ->filter(fn($item) => $item['similarity'] > 0.1)
            ->take($topN)
            ->values();
    }

    /**
     * Similaridade textual simples (baseada em palavras compartilhadas)
     */
    protected function textSimilarity(string $query, string $text): float
    {
        $queryWords = array_unique(
            array_filter(
                preg_split('/\W+/u', mb_strtolower($query)),
                fn($w) => mb_strlen($w) > 2
            )
        );

        $textWords = array_unique(
            array_filter(
                preg_split('/\W+/u', mb_strtolower($text)),
                fn($w) => mb_strlen($w) > 2
            )
        );

        if (empty($queryWords) || empty($textWords)) {
            return 0;
        }

        $intersection = array_intersect($queryWords, $textWords);
        $union = array_unique(array_merge($queryWords, $textWords));

        return count($intersection) / count($union);
    }

    /**
     * Trunca texto mantendo palavras completas
     */
    protected function truncate(string $text, int $maxLength): string
    {
        if (mb_strlen($text) <= $maxLength) {
            return $text;
        }

        $truncated = mb_substr($text, 0, $maxLength);
        $lastSpace = mb_strrpos($truncated, ' ');

        if ($lastSpace !== false) {
            $truncated = mb_substr($truncated, 0, $lastSpace);
        }

        return $truncated . '...';
    }

    public function setTopN(int $n): void
    {
        $this->topN = max(1, min(50, $n));
    }
}
