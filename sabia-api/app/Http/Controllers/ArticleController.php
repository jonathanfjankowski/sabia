<?php

namespace App\Http\Controllers;

use App\Models\AiSettings;
use App\Models\Article;
use App\Models\ArticleVersion;
use App\Services\ArticleChunkService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ArticleController extends Controller
{
    public function __construct(
        private ArticleChunkService $chunkService = new ArticleChunkService,
    ) {}

    // Usuários internos: artigos públicos ativos + nível de acesso correspondente
    public function index(Request $request): JsonResponse
    {
        $query = Article::query()->active();

        $level = $request->user()?->tokenCan('widget') ? 'public' : 'internal';
        $query->forAccessLevel($level);

        if ($q = $request->query('q')) {
            $query->where(function ($q2) use ($q) {
                $q2->where('title', 'ilike', "%{$q}%")
                    ->orWhere('summary', 'ilike', "%{$q}%");
            });
        }

        if ($cat = $request->query('category_id')) {
            $query->where('category_id', (int) $cat);
        }

        $articles = $query->with(['category', 'createdBy'])->get($this->listColumns());

        return response()->json($articles);
    }

    // Admin: todos os artigos (qualquer status)
    public function adminShow(Request $request, $id): JsonResponse
    {
        $article = Article::with(['category', 'createdBy'])->findOrFail($id);

        return response()->json($article);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $query = Article::withTrashed();

        if ($q = $request->query('q')) {
            $query->where(function ($q2) use ($q) {
                $q2->where('title', 'ilike', "%{$q}%")
                    ->orWhere('summary', 'ilike', "%{$q}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $articles = $query->with(['category', 'createdBy'])->get($this->listColumns());

        return response()->json($articles);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $article = Article::where('slug', $slug)->orWhere('id', (int) $slug)->firstOrFail();

        $level = $request->user()?->tokenCan('widget') ? 'public' : 'internal';
        if ($article->status !== 'active') {
            return response()->json(['message' => 'Artigo não encontrado'], 404);
        }
        if ($level === 'public' && $article->access_level === 'internal') {
            return response()->json(['message' => 'Artigo não encontrado'], 404);
        }

        $article->increment('views_count');

        return response()->json([
            ...$article->toArray(),
            'category' => $article->category,
            'author' => $article->createdBy,
        ]);
    }

    public function view(Request $request, $id): JsonResponse
    {
        Article::where('id', $id)->increment('views_count');

        return response()->json(['ok' => true]);
    }

    public function related(Request $request, $id): JsonResponse
    {
        $article = Article::findOrFail($id);
        $level = $request->user()?->tokenCan('widget') ? 'public' : 'internal';

        $related = Article::query()
            ->active()
            ->forAccessLevel($level)
            ->where('category_id', $article->category_id)
            ->where('id', '!=', $id)
            ->limit(3)
            ->with('category')
            ->get();

        return response()->json($related);
    }

    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        $query = Article::query()->active();
        $level = $request->user()?->tokenCan('widget') ? 'public' : 'internal';
        $query->forAccessLevel($level);

        if ($q !== '') {
            $query->where(function ($q2) use ($q) {
                $q2->where('title', 'ilike', "%{$q}%")
                    ->orWhere('summary', 'ilike', "%{$q}%")
                    ->orWhere('content', 'ilike', "%{$q}%");
            });
        }

        $results = $query->with('category')->limit(20)->get();

        return response()->json($results);
    }

    public function feedback(Request $request, $id): JsonResponse
    {
        $article = Article::findOrFail($id);
        $helpful = (bool) $request->query('helpful', true);
        $article->registerFeedback($helpful);

        return response()->json([
            'helpful_yes' => $article->helpful_yes,
            'helpful_no' => $article->helpful_no,
        ]);
    }

    // Admin CRUD

    public function adminStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'summary' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'access_level' => 'in:public,internal',
            'status' => 'in:active,draft,archived',
        ]);

        $data['created_by'] = $request->user()->profile?->id;
        $data['created_at'] = now();

        $article = Article::create($data);

        // Gera chunks + embeddings via service
        $this->chunkService->process($article);

        AuditService::record('article.create', 'article', (string) $article->id, null, $article->only(['title', 'slug', 'status', 'access_level']));

        return response()->json($article->load('category', 'createdBy'), 201);
    }

    public function adminUpdate(Request $request, $id): JsonResponse
    {
        $article = Article::findOrFail($id);

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'summary' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'access_level' => 'in:public,internal',
            'status' => 'in:active,draft,archived',
        ]);

        $oldContent = $article->content;
        $article->fill($data);
        $original = $article->only(['title', 'status', 'access_level']);

        // Incrementa versão na mudança de conteúdo (só se content foi enviado)
        if (array_key_exists('content', $data) && $data['content'] !== $oldContent) {
            ArticleVersion::create([
                'article_id' => $article->id,
                'version' => $article->version + 1,
                'content' => $oldContent,
                'edited_by' => $request->user()->profile?->id,
            ]);
            $article->version++;
        }

        $article->save();

        if (array_key_exists('content', $data)) {
            $this->chunkService->process($article);
        }

        AuditService::record('article.update', 'article', (string) $article->id, $original, $article->only(['title', 'status', 'access_level']));

        return response()->json($article->load('category', 'createdBy'));
    }

    public function adminDestroy(Request $request, $id): JsonResponse
    {
        $article = Article::findOrFail($id);
        $article->delete(); // soft delete

        return response()->json(['ok' => true]);
    }

    public function adminRestore(Request $request, $id): JsonResponse
    {
        $article = Article::withTrashed()->findOrFail($id);
        $article->restore();

        return response()->json(['ok' => true]);
    }

    public function versions(Request $request, $id): JsonResponse
    {
        $versions = ArticleVersion::where('article_id', $id)
            ->orderByDesc('version')
            ->get();

        return response()->json($versions);
    }

    public function revert(Request $request, $id, $version): JsonResponse
    {
        $article = Article::findOrFail($id);
        $av = ArticleVersion::where('article_id', $id)
            ->where('version', (int) $version)
            ->firstOrFail();

        $oldContent = $article->content;
        $article->content = $av->content;
        $article->save();

        // Armazena versão atual como snapshot antes de reverter
        if ($oldContent !== $av->content) {
            ArticleVersion::create([
                'article_id' => $article->id,
                'version' => $article->version + 1,
                'content' => $oldContent,
                'edited_by' => $request->user()->profile?->id,
            ]);
            $article->increment('version');
        }

        // Reprocessa chunks com conteúdo revertido
        $this->chunkService->process($article);

        return response()->json($article);
    }

    public function import(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'summary' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $data['created_by'] = $request->user()->profile?->id;
        $data['created_at'] = now();

        $article = Article::create($data);
        $this->chunkService->process($article);

        return response()->json($article->load('category', 'createdBy'), 201);
    }

    public function previewImport(Request $request): JsonResponse
    {
        $request->validate([
            'content' => 'required|string',
            'chunk_size' => 'integer|min:100|max:2000',
            'chunk_overlap' => 'integer|min:0|max:500',
        ]);

        // Use settings or provided values
        $chunkSize = $request->integer('chunk_size', AiSettings::current()->chunk_size);
        $overlap = $request->integer('chunk_overlap', AiSettings::current()->chunk_overlap);

        // Temporarily override settings for preview
        $tempSettings = AiSettings::current()->replicate();
        $tempSettings->chunk_size = $chunkSize;
        $tempSettings->chunk_overlap = $overlap;
        $previewService = new ArticleChunkService($tempSettings);

        $chunks = $previewService->splitContent($request->input('content'));

        return response()->json([
            'total_chunks' => count($chunks),
            'chunks' => array_map(fn ($c) => ['content' => $c], $chunks),
            'estimated_tokens' => array_sum(array_map(fn ($c) => ceil(Str::length($c) / 4), $chunks)),
        ]);
    }

    // Listagens não carregam o content (TEXT completo, MBs com o tempo) —
    // nenhuma tela de lista usa a coluna.
    private function listColumns(): array
    {
        return [
            'id', 'title', 'slug', 'summary', 'category_id', 'access_level',
            'status', 'views_count', 'helpful_yes', 'helpful_no', 'version',
            'created_by', 'created_at', 'updated_at', 'deleted_at',
        ];
    }

    // Upload de imagem — máx 4 MB (spec §9.7). Armazenado em disco público em articles/.
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|max:4096|mimes:png,jpeg,jpg,gif,webp',
        ]);

        $file = $request->file('image');
        // Rechecagem MIME no servidor — nunca confiar no tipo enviado pelo cliente
        $guessed = @mime_content_type($file->getRealPath()) ?: '';
        if (! str_starts_with($guessed, 'image/')) {
            return response()->json(['message' => 'Tipo de arquivo inválido'], 422);
        }

        $ext = $file->getClientOriginalExtension() ?: 'png';
        $name = Str::random(20).'.'.preg_replace('/[^a-z0-9]/i', '', $ext);
        $path = $file->storeAs('articles/'.date('Y/m'), $name, 'public');

        return response()->json([
            'url' => Storage::disk('public')->url($path),
            'path' => $path,
        ]);
    }
}
