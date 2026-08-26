<?php

namespace App\Services;

use App\Models\AiSettings;
use Illuminate\Support\Facades\DB;

/**
 * Busca vetorial nativa via pgvector (cosine similarity).
 *
 * Substitui o loop PHP em ChatController/PublicWidgetController que
 * carregava 100 chunks e computava cosseno em memória — lento e não escala.
 *
 * Usa operador `<=>` do pgvector (cosine distance) + filtros RLS
 * via current_role (sabia_internal / sabia_widget / sabia_bypass).
 */
class VectorSearchService
{
    public function __construct(
        private ?AiSettings $settings = null,
    ) {
        $this->settings ??= AiSettings::current();
    }

    /**
     * Busca chunks relevantes para um embedding.
     *
     * @param  array<float>  $embedding  Vetor 768 dims
     * @param  int  $topN  Quantidade (default: ai_settings.rag_top_n)
     * @param  string  $accessLevel  'internal' ou 'public' — filtra articles.access_level
     *
     * @return array<int, array{id: int, content: string, article_id: int, similarity: float}>
     */
    public function search(array $embedding, int $topN = null, string $accessLevel = 'internal'): array
    {
        $topN = $topN ?? (int) $this->settings->rag_top_n;
        $vector = '[' . implode(',', $embedding) . ']';

        // RLS já garante isolamento (sabia_internal vê internal+public ativos; sabia_widget vê só public ativos)
        // accessLevel serve como filtro extra para clareza de intenção.
        $accessFilter = $accessLevel === 'public' ? "AND a.access_level = 'public'" : '';

        $sql = <<<SQL
            SELECT
                ac.id,
                ac.content,
                ac.article_id,
                1 - (ac.embedding <=> ?::vector) AS similarity
            FROM article_chunks ac
            JOIN articles a ON a.id = ac.article_id
            WHERE a.status = 'active'
              {$accessFilter}
            ORDER BY ac.embedding <=> ?::vector
            LIMIT ?
        SQL;

        try {
            $rows = DB::select($sql, [$vector, $vector, $topN]);
            return array_map(fn ($r) => [
                'id' => $r->id,
                'content' => $r->content,
                'article_id' => $r->article_id,
                'similarity' => (float) $r->similarity,
            ], $rows);
        } catch (\Throwable $e) {
            app(\App\Services\SystemLogService::class)->log(
                'error', 'vector_search', 'Falha na busca vetorial',
                ['error' => $e->getMessage(), 'topN' => $topN, 'accessLevel' => $accessLevel]
            );
            return [];
        }
    }

    /**
     * Estima confiança baseada no top-N score.
     * Reutiliza os mesmos chunks da busca (evita query extra).
     */
    public function estimateConfidence(array $results, float $threshold): string
    {
        if (empty($results)) {
            return 'none';
        }

        $topScore = $results[0]['similarity'] ?? 0.0;

        if ($topScore >= $threshold) {
            return 'high';
        }
        if ($topScore >= $threshold * 0.6) {
            return 'low';
        }
        return 'none';
    }

    /**
     * Formata chunks para injeção no system prompt.
     */
    public function formatContext(array $results): string
    {
        if (empty($results)) {
            return '(Sem artigos relevantes na base de conhecimento.)';
        }

        return collect($results)
            ->map(fn ($r) => "[relevância: " . round($r['similarity'], 3) . "]\n" . $r['content'])
            ->implode("\n\n---\n\n");
    }
}