<?php

namespace App\Http\Controllers;

use App\Models\AiSettings;
use App\Models\BrandSettings;
use App\Models\Conversation;
use App\Models\KnowledgeGap;
use App\Models\Message;
use App\Models\WidgetSettings;
use App\Services\AIProvider;
use App\Services\PromptInjectionDetector;
use App\Services\SupportTransferService;
use App\Services\SystemLogService;
use App\Services\VectorSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PublicWidgetController extends Controller
{
    public function __construct(
        private PromptInjectionDetector $injectionDetector = new PromptInjectionDetector,
        private VectorSearchService $vectorSearch = new VectorSearchService,
    ) {}

    public function settings(): JsonResponse
    {
        $settings = WidgetSettings::current();

        // Whitelist — rota pública: nada de webhook do Teams, flags internas
        // ou lista de domínios aqui.
        return response()->json([
            'welcome_message' => $settings->welcome_message,
            'support_link' => $settings->support_link,
            'support_start_time' => $settings->support_start_time?->format('H:i'),
            'support_end_time' => $settings->support_end_time?->format('H:i'),
            'support_phone' => $settings->support_phone,
            'out_of_hours_message' => $settings->out_of_hours_message,
            'maintenance_mode' => $settings->maintenance_mode,
            'maintenance_message' => $settings->maintenance_message,
        ]);
    }

    public function brand(): JsonResponse
    {
        $settings = BrandSettings::current();

        return response()->json([
            'app_name' => $settings->app_name,
            'logo_url' => $settings->logo_url,
            'favicon_url' => $settings->favicon_url,
            'primary_color' => $settings->primary_color,
            'secondary_color' => $settings->secondary_color,
            'font' => $settings->font,
        ]);
    }

    public function chat(Request $request): StreamedResponse|JsonResponse
    {
        $data = $request->validate([
            'message' => 'required|string|max:10000',
            'conversation_id' => 'nullable|uuid',
            'session_id' => 'nullable|string|max:64',
        ]);

        $message = trim($data['message']);

        if ($this->injectionDetector->detect($message)) {
            return response()->json(['message' => 'Mensagem bloqueada por segurança.'], 400);
        }

        $settings = WidgetSettings::current();

        if ($settings->maintenance_mode) {
            return response()->json([
                'message' => $settings->maintenance_message,
                'maintenance' => true,
            ], 503);
        }

        // session_id é a credencial de posse da conversa: se o cliente não
        // traz um, geramos (CSPRNG) e devolvemos no 1º evento do stream.
        // Mesma precedência do SetRlsContext (body → header), senão a policy
        // RLS compara valores diferentes e rejeita o INSERT.
        $sessionId = $data['session_id']
            ?? $request->headers->get('X-Session-Id')
            ?? null;

        $conversation = null;
        if (! empty($data['conversation_id'])) {
            $conversation = Conversation::where('id', $data['conversation_id'])
                ->where('source', 'widget')
                ->first();

            // Sem posse da session, a conversa não existe para este chamador
            if ($conversation && (! $sessionId || ! hash_equals((string) $conversation->session_id, (string) $sessionId))) {
                return response()->json(['message' => 'Conversa não encontrada.'], 404);
            }
        }

        $sessionId ??= Str::uuid()->toString();

        if (! $conversation) {
            $conversation = Conversation::create([
                'session_id' => $sessionId,
                'source' => 'widget',
                'access_level' => 'public',
                'title' => mb_substr($message, 0, 60),
            ]);
        }

        $userMsg = Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $message,
        ]);

        $aiSettings = AiSettings::current();
        $ragTopN = (int) $aiSettings->rag_top_n;

        $provider = new AIProvider($aiSettings);
        $embedding = $provider->embed($message);

        // embed() não lança: falha de rede volta [] — sem base de conhecimento
        // o bot alucinaria; melhor devolver 503 como no ChatController.
        if (empty($embedding)) {
            app(SystemLogService::class)->log(
                'error', 'chat.embed', 'Embedding vazio do provedor de IA',
                ['conversation_id' => $conversation->id]
            );

            return response()->json([
                'message' => 'Serviço de IA temporariamente indisponível. Tente novamente em instantes.',
            ], 503);
        }

        $searchResults = $this->vectorSearch->search($embedding, $ragTopN, 'public');
        $context = $this->vectorSearch->formatContext($searchResults);
        $confidenceLevel = $this->vectorSearch->estimateConfidence($searchResults, (float) $aiSettings->confidence_threshold);

        $systemPrompt = $this->buildWidgetPrompt($context, $aiSettings->system_prompt, $settings);

        // Histórico: últimas 20 mensagens anteriores à atual, em ordem cronológica
        $history = Message::where('conversation_id', $conversation->id)
            ->whereKeyNot($userMsg->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->reverse()
            ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])
            ->values()
            ->toArray();

        return response()->stream(function () use ($provider, $message, $systemPrompt, $history, $conversation, $sessionId, $confidenceLevel, $searchResults) {
            // 1º evento: ids para o frontend continuar a mesma conversa/sessão
            echo 'data: '.json_encode(['conversation_id' => $conversation->id, 'session_id' => $sessionId])."\n\n";
            if (ob_get_level() > 0) {
                @ob_flush();
            }
            flush();

            $fullText = '';

            try {
                foreach ($provider->chat($message, $systemPrompt, $history) as $chunk) {
                    $fullText .= $chunk;
                    echo 'data: '.json_encode(['text' => $chunk])."\n\n";
                    if (ob_get_level() > 0) {
                        @ob_flush();
                    }
                    flush();
                }
            } catch (\Throwable) {
                echo "data: \"Desculpe, ocorreu um erro ao gerar a resposta.\"\n\n";
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
                        'source' => 'widget',
                        'session_id' => $sessionId,
                    ]);
                }
            } catch (\Throwable) {
                // non-blocking
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    public function close(Request $request, $id): JsonResponse
    {
        $conversation = $this->findOwnedConversation($request, $id);

        if (! $conversation) {
            return response()->json(['message' => 'Conversa não encontrada.'], 404);
        }

        $data = $request->validate([
            'rating' => 'nullable|integer|min:1|max:5',
        ]);

        $conversation->update([
            'is_closed' => true,
            'closed_at' => now(),
            'rating' => $data['rating'] ?? null,
        ]);

        return response()->json($conversation);
    }

    public function transfer(Request $request, $id): JsonResponse
    {
        $conversation = $this->findOwnedConversation($request, $id);

        if (! $conversation) {
            return response()->json(['message' => 'Conversa não encontrada.'], 404);
        }

        $transferService = new SupportTransferService;
        $result = $transferService->tryTransfer($conversation);

        return response()->json([
            'transferred' => $result['transferred'],
            'reason' => $result['reason'],
            'link' => $result['link'] ?? null,
        ]);
    }

    /**
     * Localiza a conversa do widget exigindo posse pelo session_id — sem
     * isso qualquer cliente com um conversation_id fecharia/transferiria
     * conversas de outros visitantes.
     */
    private function findOwnedConversation(Request $request, string $id): ?Conversation
    {
        $sessionId = (string) ($request->input('session_id') ?? $request->header('X-Session-Id') ?? '');

        if ($sessionId === '') {
            return null;
        }

        $conversation = Conversation::where('id', $id)->where('source', 'widget')->first();

        if (! $conversation || ! hash_equals((string) $conversation->session_id, $sessionId)) {
            return null;
        }

        return $conversation;
    }

    private function buildWidgetPrompt(string $context, ?string $customPrompt, WidgetSettings $settings): string
    {
        $base = $customPrompt
            ?? 'Voce e um assistente de suporte. Responda educadamente em markdown. Se nao souber, diga que nao tem certeza e sugira falar com o suporte humano.';

        $supportInfo = '';
        if ($settings->support_phone || $settings->support_link) {
            $supportInfo = "\n\nContato de suporte: ".($settings->support_link ?? $settings->support_phone);
        }

        return $base.$supportInfo."\n\n=== CONTEXTO DA BASE DE CONHECIMENTO ===\n".$context."\n=== FIM DO CONTEXTO ===";
    }
}
