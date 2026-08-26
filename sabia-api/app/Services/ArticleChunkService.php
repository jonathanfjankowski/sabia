<?php

namespace App\Services;

use App\Models\Article;
use App\Models\ArticleChunk;
use App\Models\AiSettings;
use App\Services\AIProvider;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Service para dividir artigos em chunks e gerar embeddings.
 *
 * Usa configurações de ai_settings: chunk_size, chunk_overlap, embedding_model.
 * Chamado automaticamente ao salvar/atualizar artigo (store/update/destroy).
 */
class ArticleChunkService
{
    public function __construct(
        private AiSettings $settings = null,
    ) {
        $this->settings ??= AiSettings::current();
    }

    /**
     * Processa um artigo: apaga chunks antigos, cria novos, gera embeddings.
     *
     * @return int Quantidade de chunks criados
     */
    public function process(Article $article): int
    {
        // 1) Delete old chunks
        ArticleChunk::where('article_id', $article->id)->delete();

        // 2) Split content into chunks
        $chunks = $this->splitContent($article->content);

        if (empty($chunks)) {
            return 0;
        }

        // 3) Generate embeddings + save
        $provider = new AIProvider($this->settings);
        $created = 0;

        foreach ($chunks as $index => $content) {
            // Skip empty chunks
            $content = trim($content);
            if ($content === '') continue;

            try {
                $embedding = $provider->embed($content);
                if (empty($embedding)) {
                    app(\App\Services\SystemLogService::class)->log(
                        'warning', 'chunk_embedding', 'Embedding vazio para chunk',
                        ['article_id' => $article->id, 'chunk_index' => $index]
                    );
                    continue;
                }

                ArticleChunk::create([
                    'article_id' => $article->id,
                    'content' => $content,
                    'chunk_index' => $index,
                    'embedding' => $embedding,
                    'keywords' => $this->extractKeywords($content),
                ]);
                $created++;
            } catch (\Throwable $e) {
                app(\App\Services\SystemLogService::class)->log(
                    'error', 'chunk_embedding', 'Falha ao gerar embedding',
                    ['article_id' => $article->id, 'chunk_index' => $index, 'error' => $e->getMessage()]
                );
            }
        }

        return $created;
    }

    /**
     * Divide texto em chunks respeitando chunk_size e chunk_overlap.
     * Tenta quebrar em parágrafos primeiro; fallback para caracteres.
     *
     * @return array<string> Lista de chunks
     */
    private function splitContent(string $content): array
    {
        $chunkSize = (int) $this->settings->chunk_size;
        $overlap = (int) $this->settings->chunk_overlap;

        // Normalize line endings
        $content = Str::replace("\r\n", "\n", $content);
        $content = Str::replace("\r", "\n", $content);

        // Try paragraph-based splitting first (more semantic)
        $paragraphs = array_filter(
            explode("\n\n", $content),
            fn ($p) => trim($p) !== ''
        );

        if (count($paragraphs) <= 1) {
            // Single paragraph or no paragraphs — fallback to character-based
            return $this->splitByCharacters($content, $chunkSize, $overlap);
        }

        $chunks = [];
        $current = '';
        $buffer = '';

        foreach ($paragraphs as $paragraph) {
            $paragraph = trim($paragraph) . "\n\n";

            // If adding this paragraph exceeds chunk_size, finalize current chunk
            if (Str::length($current) + Str::length($paragraph) > $chunkSize && $current !== '') {
                $chunks[] = trim($current);
                // Start new chunk with overlap from end of previous
                $current = $this->getOverlap($current, $overlap) . $paragraph;
            } else {
                $current .= $paragraph;
            }
        }

        if ($current !== '') {
            $chunks[] = trim($current);
        }

        // Safety: ensure no chunk exceeds chunk_size significantly
        $final = [];
        foreach ($chunks as $chunk) {
            if (Str::length($chunk) <= $chunkSize * 1.2) {
                $final[] = $chunk;
            } else {
                // Split oversized chunk by characters
                $final = array_merge($final, $this->splitByCharacters($chunk, $chunkSize, $overlap));
            }
        }

        return $final;
    }

    /**
     * Fallback: split by characters with overlap.
     */
    private function splitByCharacters(string $text, int $chunkSize, int $overlap): array
    {
        $text = trim($text);
        if (Str::length($text) <= $chunkSize) {
            return [$text];
        }

        $chunks = [];
        $start = 0;
        $len = Str::length($text);

        while ($start < $len) {
            $end = min($start + $chunkSize, $len);
            $chunk = Str::substr($text, $start, $end - $start);

            // Try to break at sentence boundary
            if ($end < $len) {
                $lastPunct = max(
                    Str::lastIndexOf($chunk, '. '),
                    Str::lastIndexOf($chunk, '! '),
                    Str::lastIndexOf($chunk, '? ')
                );
                if ($lastPunct > $chunkSize * 0.5) {
                    $end = $start + $lastPunct + 1;
                    $chunk = Str::substr($text, $start, $end - $start);
                }
            }

            $chunks[] = trim($chunk);
            $start = $end - $overlap;
            if ($start < 0) $start = 0;
        }

        return $chunks;
    }

    /**
     * Extrai último N caracteres para overlap.
     */
    private function getOverlap(string $text, int $overlap): string
    {
        $len = Str::length($text);
        if ($len <= $overlap) return $text;
        return Str::substr($text, $len - $overlap);
    }

    /**
     * Extrai palavras-chave simples (top 10 palavras > 3 chars).
     * Usado para busca híbrida futura.
     *
     * @return array<string>
     */
    private function extractKeywords(string $content): array
    {
        $words = Str::lower($content);
        $words = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $words);
        $words = preg_split('/\s+/', $words, -1, PREG_SPLIT_NO_EMPTY);

        $freq = [];
        foreach ($words as $w) {
            if (Str::length($w) < 4) continue; // skip short words
            if (in_array($w, $this->stopWords(), true)) continue;
            $freq[$w] = ($freq[$w] ?? 0) + 1;
        }

        arsort($freq);
        return array_slice(array_keys($freq), 0, 10);
    }

    private function stopWords(): array
    {
        return [
            'para', 'com', 'que', 'por', 'uma', 'dos', 'das', 'dos', 'nos', 'nas',
            'este', 'esta', 'esse', 'essa', 'mais', 'muito', 'como', 'sobre',
            'entre', 'após', 'antes', 'durante', 'através', 'também', 'mesmo',
            'outro', 'outra', 'outros', 'outras', 'pode', 'poder', 'devem', 'deve',
        ];
    }
}