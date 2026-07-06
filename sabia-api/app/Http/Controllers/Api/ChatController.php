<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\KnowledgeGap;
use App\Models\AiSetting;
use App\Services\AiServiceFactory;
use App\Services\PromptInjectionDetector;
use App\Services\ScopeGuardService;
use App\Services\VectorSearchService;
use App\Services\ConfidenceEvaluator;
use App\Services\EmbeddingService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use RuntimeException;

class ChatController extends Controller
{
    protected PromptInjectionDetector $injectionDetector;
    protected ScopeGuardService $scopeGuard;
    protected VectorSearchService $vectorSearch;
    protected ConfidenceEvaluator $confidenceEvaluator;
    protected EmbeddingService $embeddingService;

    public function __construct()
    {
        $this->injectionDetector = new PromptInjectionDetector();
        $this->scopeGuard = new ScopeGuardService();
        $this->embeddingService = new EmbeddingService();
        $this->vectorSearch = new VectorSearchService($this->embeddingService);
        $this->confidenceEvaluator = new ConfidenceEvaluator();
    }

    /**
     * Enviar mensagem no chat (cria conversa automaticamente se necessário)
     */
    public function send(Request $request)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:50000',
            'conversation_id' => 'nullable|exists:conversations,id',
            'title' => 'nullable|string|max:255',
        ]);

        // Obter ou criar conversa
        if (!empty($validated['conversation_id'])) {
            $conversation = Conversation::where('user_id', $request->user()->id)
                ->findOrFail($validated['conversation_id']);
        } else {
            $conversation = Conversation::create([
                'user_id' => $request->user()->id,
                'session_id' => Str::uuid(),
                'title' => $validated['title'] ?? mb_substr($validated['content'], 0, 50),
                'source' => 'direct',
                'access_level' => 'internal',
            ]);
        }

        // Delegar para o MessageController
        $msgController = app(MessageController::class);
        return $msgController->send($request, $conversation->id);
    }

    /**
     * Histórico de conversas do chat
     */
    public function history(Request $request)
    {
        $conversations = Conversation::where('user_id', $request->user()->id)
            ->withCount('messages')
            ->with(['aiProvider:id,name'])
            ->orderBy('updated_at', 'desc')
            ->paginate(20);

        return response()->json($conversations);
    }

    /**
     * Fechar conversa do chat
     */
    public function close(Request $request, Conversation $conversation)
    {
        if ($conversation->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'feedback' => 'nullable|string|max:2000',
        ]);

        $conversation->update([
            'is_closed' => true,
            'closed_at' => now(),
            'rating' => $validated['rating'],
        ]);

        return response()->json([
            'message' => 'Conversa encerrada.',
            'rating' => $validated['rating'],
        ]);
    }
}
