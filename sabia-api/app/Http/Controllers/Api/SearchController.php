<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\AiSetting;
use App\Services\VectorSearchService;
use App\Services\EmbeddingService;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    protected VectorSearchService $vectorSearch;

    public function __construct()
    {
        $this->vectorSearch = new VectorSearchService(new EmbeddingService());
    }

    public function search(Request $request)
    {
        $validated = $request->validate([
            'q' => 'required|string|max:500',
            'type' => 'nullable|in:semantic,text,hybrid',
        ]);

        $query = $validated['q'];
        $type = $validated['type'] ?? 'hybrid';
        $aiSettings = AiSetting::getActive();
        $topN = $aiSettings->rag_top_n ?? 5;

        // Busca semântica (pgvector)
        $semanticResults = collect();
        if (in_array($type, ['semantic', 'hybrid'])) {
            $semanticResults = $this->vectorSearch->search($query, $topN);
        }

        // Busca textual (SQL LIKE)
        $textResults = collect();
        if (in_array($type, ['text', 'hybrid'])) {
            $textResults = Article::published()
                ->with('category:id,name')
                ->where(function ($q) use ($query) {
                    $q->where('title', 'LIKE', "%{$query}%")
                      ->orWhere('summary', 'LIKE', "%{$query}%")
                      ->orWhere('content', 'LIKE', "%{$query}%");
                })
                ->limit($topN)
                ->get()
                ->map(fn($a) => [
                    'article_id' => $a->id,
                    'article_title' => $a->title,
                    'article_slug' => $a->slug,
                    'category' => $a->category?->name,
                    'content' => mb_substr(strip_tags($a->content), 0, 300),
                    'similarity' => 0.5,
                    'source' => 'text',
                ]);
        }

        // Merge dos resultados (híbrido)
        $merged = $semanticResults;
        if ($type === 'hybrid') {
            $existingIds = $semanticResults->pluck('article_id')->toArray();
            $textResults = $textResults->filter(fn($r) => !in_array($r['article_id'], $existingIds));
            $merged = $semanticResults->concat($textResults)->sortByDesc('similarity')->take($topN);
        } elseif ($type === 'text') {
            $merged = $textResults;
        }

        return response()->json([
            'query' => $query,
            'type' => $type,
            'total' => $merged->count(),
            'results' => $merged->values(),
        ]);
    }
}
