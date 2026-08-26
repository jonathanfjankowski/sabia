<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\ArticleSuggestion;
use App\Models\Category;
use App\Models\Profile;
use App\Services\ArticleChunkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ArticleSuggestionController extends Controller
{
    public function __construct(
        private ArticleChunkService $chunkService = new ArticleChunkService(),
    ) {}

    // Operador/Gestor: listar próprias sugestões
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = $user->profile;

        $query = ArticleSuggestion::query()
            ->with(['category', 'suggestedBy', 'reviewedBy', 'article'])
            ->latest();

        if ($profile->isGestor()) {
            // Gestor vê todas (com filtro opcional)
            if ($status = $request->query('status')) {
                $query->where('status', $status);
            }
        } else {
            // Operador vê apenas suas
            $query->where('suggested_by', $profile->id);
        }

        if ($cat = $request->query('category_id')) {
            $query->where('category_id', (int) $cat);
        }

        $suggestions = $query->paginate(20);

        return response()->json($suggestions);
    }

    // Operador: criar sugestão
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'summary' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'access_level' => 'in:public,internal',
        ]);

        $data['suggested_by'] = $request->user()->profile->id;
        $data['status'] = 'pending';

        $suggestion = ArticleSuggestion::create($data);

        return response()->json($suggestion->load(['category', 'suggestedBy']), 201);
    }

    // Ver detalhes da sugestão
    public function show(Request $request, $id): JsonResponse
    {
        $suggestion = ArticleSuggestion::with(['category', 'suggestedBy', 'reviewedBy', 'article'])->findOrFail($id);

        $profile = $request->user()->profile;
        if (!$profile->isGestor() && $suggestion->suggested_by !== $profile->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        return response()->json($suggestion);
    }

    // Operador: atualizar própria sugestão (apenas se pendente)
    public function update(Request $request, $id): JsonResponse
    {
        $suggestion = ArticleSuggestion::findOrFail($id);

        $profile = $request->user()->profile;
        if ($suggestion->suggested_by !== $profile->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if ($suggestion->status !== 'pending') {
            return response()->json(['message' => 'Sugestão não pode mais ser editada.'], 422);
        }

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'summary' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'access_level' => 'in:public,internal',
        ]);

        $suggestion->update($data);

        return response()->json($suggestion->load(['category', 'suggestedBy']));
    }

    // Operador: cancelar própria sugestão
    public function cancel(Request $request, $id): JsonResponse
    {
        $suggestion = ArticleSuggestion::findOrFail($id);

        $profile = $request->user()->profile;
        if ($suggestion->suggested_by !== $profile->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if ($suggestion->status !== 'pending') {
            return response()->json(['message' => 'Sugestão não pode mais ser cancelada.'], 422);
        }

        $suggestion->update(['status' => 'rejected', 'reviewed_by' => $profile->id, 'reviewed_at' => now()]);

        return response()->json($suggestion);
    }

    // Gestor: aprovar sugestão (cria artigo)
    public function approve(Request $request, $id): JsonResponse
    {
        $suggestion = ArticleSuggestion::findOrFail($id);

        $profile = $request->user()->profile;
        if (!$profile->isGestor()) {
            return response()->json(['message' => 'Apenas gestores podem aprovar.'], 403);
        }

        if ($suggestion->status !== 'pending') {
            return response()->json(['message' => 'Sugestão já processada.'], 422);
        }

        return DB::transaction(function () use ($suggestion, $profile, $request) {
            // Cria artigo a partir da sugestão
            $article = Article::create([
                'title' => $suggestion->title,
                'content' => $suggestion->content,
                'summary' => $suggestion->summary,
                'category_id' => $suggestion->category_id,
                'access_level' => $suggestion->access_level,
                'status' => 'active',
                'created_by' => $profile->id,
            ]);

            // Processa chunks + embeddings
            $this->chunkService->process($article);

            // Atualiza sugestão
            $suggestion->update([
                'status' => 'published',
                'article_id' => $article->id,
                'reviewed_by' => $profile->id,
                'reviewed_at' => now(),
                'review_notes' => $request->input('review_notes'),
            ]);

            return response()->json([
                'suggestion' => $suggestion->load(['category', 'suggestedBy', 'reviewedBy', 'article']),
                'article' => $article->load('category', 'createdBy'),
            ]);
        });
    }

    // Gestor: aprovar com edição (gestor edita antes de publicar)
    public function approveWithEdit(Request $request, $id): JsonResponse
    {
        $suggestion = ArticleSuggestion::findOrFail($id);

        $profile = $request->user()->profile;
        if (!$profile->isGestor()) {
            return response()->json(['message' => 'Apenas gestores podem aprovar.'], 403);
        }

        if ($suggestion->status !== 'pending') {
            return response()->json(['message' => 'Sugestão já processada.'], 422);
        }

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'summary' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'access_level' => 'in:public,internal',
            'review_notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($suggestion, $profile, $data) {
            // Cria artigo com conteúdo editado pelo gestor
            $article = Article::create([
                'title' => $data['title'],
                'content' => $data['content'],
                'summary' => $data['summary'],
                'category_id' => $data['category_id'] ?? $suggestion->category_id,
                'access_level' => $data['access_level'] ?? $suggestion->access_level,
                'status' => 'active',
                'created_by' => $profile->id,
            ]);

            $this->chunkService->process($article);

            $suggestion->update([
                'status' => 'published',
                'article_id' => $article->id,
                'reviewed_by' => $profile->id,
                'reviewed_at' => now(),
                'review_notes' => $data['review_notes'] ?? null,
            ]);

            return response()->json([
                'suggestion' => $suggestion->load(['category', 'suggestedBy', 'reviewedBy', 'article']),
                'article' => $article->load('category', 'createdBy'),
            ]);
        });
    }

    // Gestor: rejeitar sugestão
    public function reject(Request $request, $id): JsonResponse
    {
        $suggestion = ArticleSuggestion::findOrFail($id);

        $profile = $request->user()->profile;
        if (!$profile->isGestor()) {
            return response()->json(['message' => 'Apenas gestores podem rejeitar.'], 403);
        }

        if ($suggestion->status !== 'pending') {
            return response()->json(['message' => 'Sugestão já processada.'], 422);
        }

        $data = $request->validate([
            'review_notes' => 'required|string|max:1000',
        ]);

        $suggestion->update([
            'status' => 'rejected',
            'reviewed_by' => $profile->id,
            'reviewed_at' => now(),
            'review_notes' => $data['review_notes'],
        ]);

        return response()->json($suggestion->load(['category', 'suggestedBy', 'reviewedBy']));
    }
}