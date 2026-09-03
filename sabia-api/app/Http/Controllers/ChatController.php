<?php

namespace App\Http\Controllers;

use App\Models\AiSettings;
use App\Models\Conversation;
use App\Models\KnowledgeGap;
use App\Models\Message;
use App\Services\AIProvider;
use App\Services\PromptInjectionDetector;
use App\Services\SystemLogService;
use App\Services\VectorSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ChatController extends Controller
{
    public function __construct(
        private PromptInjectionDetector $injectionDetector = new PromptInjectionDetector,
        private VectorSearchService $vectorSearch = new VectorSearchService,
    ) {}

    public function send(Request $request): StreamedResponse|JsonResponse
    {
        $data = $request->validate([
            'message' => 'required|string|max:10000',
            'conversation_id' => 'nullable|uuid',
            'images' => 'nullable|array|max:5',
        ]);

        $message = trim($data['message']);

        // 1) Prompt injection check
        if ($this->injectionDetector->detect($message)) {
            app(SystemLogService::class)->log('warning', 'prompt_injection', 'Detectada tentativa de prompt injection', [
                'user_id' => $request->user()?->id,
                'input' => substr($message, 0, 500),
            ]);

            return response()->json(['message' => 'Mensagem bloqueada por segurança.'], 400);
        }

        // 2) Load settings
        $settings = AiSettings::current();
        $confidenceThreshold = (float) $settings->confidence_threshold;
        $ragTopN = (int) $settings->rag_top_n;

        // 3) Find or create conversation
        $convId = $data['conversation_id'] ?? null;
        if ($convId) {
            $conversation = Conversation::findOrFail($convId);

            // IDOR check — RLS é a segunda camada, não a única
            if (! $request->user()->profile?->isGestor()
                && $conversation->user_id !== $request->user()->profile?->id) {
                return response()->json(['message' => 'Não autorizado.'], 403);
            }
        } else {
            $conversation = Conversation::create([
                'user_id' => $request->user()?->profile?->id,
                'source' => 'direct',
                'access_level' => 'internal',
                'title' => mb_substr($message, 0, 60),
            ]);
        }

        // 4) Save user message
        $userMsg = Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $message,
            'has_images' => ! empty($data['images']),
        ]);

        // 5) RAG: embed query → vector search (pgvector nativo)
        $provider = new AIProvider(AiSettings::current());
        $embedding = $provider->embed($message);

        if (empty($embedding)) {
            app(SystemLogService::class)->log(
                'error', 'chat.embed', 'Embedding vazio do provedor de IA',
                ['user_id' => $request->user()?->id, 'conversation_id' => $conversation->id]
            );

            return response()->json([
                'message' => 'Serviço de IA temporariamente indisponível. Tente novamente em instantes.',
            ], 503);
        }

        $searchResults = $this->vectorSearch->search($embedding, $ragTopN, 'internal');
        $context = $this->vectorSearch->formatContext($searchResults);
        $confidenceLevel = $this->vectorSearch->estimateConfidence($searchResults, $confidenceThreshold);

        $systemPrompt = $this->buildSystemPrompt($context, $settings->system_prompt);

        // 6) Get conversation history — últimas 20 anteriores à mensagem atual
        // (ASC + limit pegaria as 20 mais antigas da conversa)
        $history = Message::where('conversation_id', $conversation->id)
            ->whereKeyNot($userMsg->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->reverse()
            ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])
            ->values()
            ->toArray();

        // 7) Stream SSE
        return response()->stream(function () use ($provider, $systemPrompt, $history, $conversation, $message, $confidenceLevel, $searchResults) {
            // 1º evento carrega o id da conversa para o frontend reutilizar
            // na próxima mensagem (sem isso cada mensagem criava conversa nova)
            echo 'data: '.json_encode(['conversation_id' => $conversation->id])."\n\n";
            if (ob_get_level() > 0) {
                @ob_flush();
            }
            flush();

            $fullText = '';

            foreach ($provider->chat($message, $systemPrompt, $history) as $chunk) {
                $fullText .= $chunk;
                echo 'data: '.json_encode(['text' => $chunk])."\n\n";
                if (ob_get_level() > 0) {
                    @ob_flush();
                }
                flush();
            }

            echo "data: [DONE]\n\n";
            if (ob_get_level() > 0) {
                @ob_flush();
            }
            flush();

            // 8) Save assistant message (best-effort, non-blocking)
            try {
                $topScore = $searchResults[0]['similarity'] ?? 0.0;

                Message::create([
                    'conversation_id' => $conversation->id,
                    'role' => 'assistant',
                    'content' => $fullText,
                    'confidence' => $topScore,
                    'confidence_level' => $confidenceLevel,
                ]);

                if ($confidenceLevel === 'none') {
                    KnowledgeGap::create([
                        'question' => $message,
                        'conversation_id' => $conversation->id,
                        'source' => 'direct',
                        'session_id' => (string) $conversation->id,
                    ]);
                }

                // TODO: Teams notification on gap / transfer when SupportTransferService is added
            } catch (\Throwable $e) {
                // Non-blocking: stream already sent
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function buildSystemPrompt(string $context, ?string $customPrompt = null): string
    {
        $base = $customPrompt ?: 'Você é um assistente de suporte. Responda APENAS perguntas baseadas na base de conhecimento fornecida. Responda sempre em markdown.';

        return $base."\n\n=== CONTEXTO DA BASE DE CONHECIMENTO ===\n".$context."\n=== FIM DO CONTEXTO ===";
    }
}
