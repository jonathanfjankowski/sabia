<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\ArticleVersion;
use App\Models\ArticleChunk;
use App\Services\ArticleChunkService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ArticleController extends Controller
{
    protected ArticleChunkService $chunkService;

    public function __construct(ArticleChunkService $chunkService)
    {
        $this->chunkService = $chunkService;
    }

    /**
     * Listar artigos com filtros
     */
    public function index(Request $request)
    {
        $query = Article::with(['category', 'author'])
            ->withCount('evaluations');

        // Filtros
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                  ->orWhere('summary', 'LIKE', "%{$search}%")
                  ->orWhere('content', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            if ($request->status === 'published') {
                $query->published();
            } elseif ($request->status === 'draft') {
                $query->where('is_published', false);
            } elseif ($request->status === 'archived') {
                $query->onlyTrashed();
            }
        }

        if ($request->has('tag')) {
            $query->withTag($request->tag);
        }

        // Ordenação
        $sortField = $request->sort_by ?? 'created_at';
        $sortOrder = $request->sort_order ?? 'desc';
        $allowedFields = ['title', 'created_at', 'updated_at', 'views_count', 'avg_rating'];
        
        if (in_array($sortField, $allowedFields)) {
            $query->orderBy($sortField, $sortOrder === 'asc' ? 'asc' : 'desc');
        }

        $articles = $query->paginate($request->per_page ?? 15);

        return response()->json($articles);
    }

    /**
     * Criar novo artigo
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:500',
            'summary' => 'nullable|string|max:1000',
            'content' => 'required|string',
            'category_id' => 'required|exists:categories,id',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'is_published' => 'sometimes|boolean',
        ]);

        $validated['slug'] = Str::slug($validated['title']);
        $baseSlug = $validated['slug'];
        $counter = 1;
        while (Article::where('slug', $validated['slug'])->exists()) {
            $validated['slug'] = $baseSlug . '-' . $counter++;
        }

        $validated['author_id'] = $request->user()->id;

        if ($request->boolean('is_published')) {
            $validated['published_at'] = now();
        }

        $article = Article::create($validated);

        // Criar primeira versão
        ArticleVersion::create([
            'article_id' => $article->id,
            'version' => 1,
            'title' => $article->title,
            'summary' => $article->summary,
            'content' => $article->content,
            'changelog' => 'Versão inicial',
            'edited_by' => $request->user()->id,
        ]);

        // Processar chunks
        $this->chunkService->processArticle($article);

        $article->load(['category', 'author']);

        return response()->json($article, 201);
    }

    /**
     * Exibir artigo
     */
    public function show(Article $article)
    {
        $article->load(['category', 'author', 'evaluations']);

        // Incrementar visualização
        $article->incrementViews();

        return response()->json($article);
    }

    /**
     * Atualizar artigo
     */
    public function update(Request $request, Article $article)
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:500',
            'summary' => 'nullable|string|max:1000',
            'content' => 'sometimes|string',
            'category_id' => 'sometimes|exists:categories,id',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'is_published' => 'sometimes|boolean',
            'changelog' => 'nullable|string|max:500',
        ]);

        if (isset($validated['title'])) {
            $validated['slug'] = Str::slug($validated['title']);
            $baseSlug = $validated['slug'];
            $counter = 1;
            while (Article::where('slug', $validated['slug'])->where('id', '!=', $article->id)->exists()) {
                $validated['slug'] = $baseSlug . '-' . $counter++;
            }
        }

        if ($request->has('is_published') && $request->boolean('is_published') && !$article->published_at) {
            $validated['published_at'] = now();
        }

        $article->update($validated);

        // Criar nova versão
        $latestVersion = ArticleVersion::where('article_id', $article->id)->max('version') ?? 0;
        
        ArticleVersion::create([
            'article_id' => $article->id,
            'version' => $latestVersion + 1,
            'title' => $article->title,
            'summary' => $article->summary,
            'content' => $article->content,
            'changelog' => $request->changelog ?? 'Atualização',
            'edited_by' => $request->user()->id,
        ]);

        // Atualizar chunks
        $this->chunkService->processArticle($article);

        $article->load(['category', 'author']);

        return response()->json($article);
    }

    /**
     * Excluir artigo (soft delete)
     */
    public function destroy(Article $article)
    {
        $article->delete();

        return response()->json(['message' => 'Artigo arquivado com sucesso.']);
    }

    /**
     * Restaurar artigo
     */
    public function restore(int $id)
    {
        $article = Article::withTrashed()->findOrFail($id);
        $article->restore();

        return response()->json(['message' => 'Artigo restaurado com sucesso.']);
    }

    /**
     * Listar versões de um artigo
     */
    public function versions(Article $article)
    {
        $versions = $article->versions()->with('editor')->orderBy('version', 'desc')->get();

        return response()->json($versions);
    }

    /**
     * Reverter artigo para versão específica
     */
    public function revert(Request $request, Article $article, int $version)
    {
        $oldVersion = ArticleVersion::where('article_id', $article->id)
            ->where('version', $version)
            ->firstOrFail();

        $article->update([
            'title' => $oldVersion->title,
            'summary' => $oldVersion->summary,
            'content' => $oldVersion->content,
        ]);

        // Criar nova versão com o conteúdo restaurado
        $latestVersion = ArticleVersion::where('article_id', $article->id)->max('version') ?? 0;
        
        ArticleVersion::create([
            'article_id' => $article->id,
            'version' => $latestVersion + 1,
            'title' => $oldVersion->title,
            'summary' => $oldVersion->summary,
            'content' => $oldVersion->content,
            'changelog' => "Revertido para versão {$version}",
            'edited_by' => $request->user()->id,
        ]);

        // Atualizar chunks
        $this->chunkService->processArticle($article);

        return response()->json(['message' => "Artigo revertido para versão {$version} com sucesso."]);
    }

    /**
     * Preview de importação de markdown
     */
    public function previewImport(Request $request)
    {
        $validated = $request->validate([
            'content' => 'required|string',
            'title' => 'nullable|string|max:500',
        ]);

        // Simular preview do chunking
        $chunks = $this->chunkService->splitIntoChunks($validated['content']);
        $keywords = [];
        foreach ($chunks as $index => $chunk) {
            $keywords[$index] = $this->chunkService->extractKeywords($chunk);
        }

        return response()->json([
            'title' => $validated['title'] ?? '(sem título)',
            'total_chunks' => count($chunks),
            'total_chars' => strlen($validated['content']),
            'chunks' => collect($chunks)->map(function ($chunk, $index) use ($keywords) {
                return [
                    'index' => $index,
                    'content' => $chunk,
                    'length' => strlen($chunk),
                    'keywords' => $keywords[$index] ?? [],
                ];
            }),
        ]);
    }

    /**
     * Artigos relacionados
     */
    public function related(Article $article)
    {
        $related = Article::published()
            ->where('id', '!=', $article->id)
            ->where(function ($q) use ($article) {
                // Mesma categoria
                $q->where('category_id', $article->category_id);

                // Ou mesmas tags
                if ($article->tags) {
                    foreach ($article->tags as $tag) {
                        $q->orWhereJsonContains('tags', $tag);
                    }
                }
            })
            ->limit(5)
            ->get();

        return response()->json($related);
    }

    /**
     * Feedback útil/não útil
     */
    public function feedback(Request $request, Article $article)
    {
        $validated = $request->validate([
            'helpful' => 'required|boolean',
        ]);

        if ($validated['helpful']) {
            $article->increment('helpful_yes');
        } else {
            $article->increment('helpful_no');
        }

        return response()->json(['message' => 'Feedback registrado com sucesso.']);
    }
}
