<?php

namespace App\Http\Controllers;

use App\Models\AiSettings;
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
        private PromptInjectionDetector $injectionDetector = new PromptInjectionDetector(),
        private VectorSearchService $vectorSearch = new VectorSearchService(),
    ) {}

    public function settings(): JsonResponse
    {
        $settings = WidgetSettings::current();

        return response()->json(array_merge($settings->toArray(), [
            'support_start_time' => $settings->support_start_time
                ? $settings->support_start_time->format('H:i')
                : null,
            'support_end_time' => $settings->support_end_time
                ? $settings->support_end_time->format('H:i')
                : null,
        ]));
    }

    public function brand(): JsonResponse
    {
        $settings = \App\Models\BrandSettings::current();

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
            'session_id' => 'nullable|string',
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

        $sessionId = $data['session_id']
            ?? $data['conversation_id']
            ?? Str::random(36);

        $conversation = Conversation::updateOrCreate(
            ['id' => $data['conversation_id'] ?? null],
            [
                'session_id' => $sessionId,
                'source' => 'widget',
                'access_level' => 'public',
                'title' => mb_substr($message, 0, 60),
            ]
        );

        Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $message,
        ]);

        $aiSettings = AiSettings::current();
        $ragTopN = (int) $aiSettings->rag_top_n;

        try {
            $provider = new AIProvider(\App\Models\AiSettings::current());
            $embedding = $provider->embed($message);
        } catch (\Throwable) {
            return response()->json(['message' => 'Serviço de IA indisponível.'], 503);
        }

        $searchResults = $this->vectorSearch->search($embedding, $ragTopN, 'public');
        $context = $this->vectorSearch->formatContext($searchResults);
        $confidenceLevel = $this->vectorSearch->estimateConfidence($searchResults, (float) $aiSettings->confidence_threshold);

        $systemPrompt = $this->buildWidgetPrompt($context, $aiSettings->system_prompt, $settings);

        return response()->stream(function () use ($provider, $message, $systemPrompt, $conversation, $aiSettings, $confidenceLevel, $searchResults) {
            $fullText = '';

            try {
                foreach ($provider->chat($message, $systemPrompt, []) as $chunk) {
                    $fullText .= $chunk;
                    echo 'data: ' . json_encode(['text' => $chunk]) . "\n\n";
                    ob_flush();
                    flush();
                }
            } catch (\Throwable) {
                echo "data: \"Desculpe, ocorreu um erro ao gerar a resposta.\"\n\n";
                ob_flush();
                flush();
            }

            echo "data: [DONE]\n\n";
            ob_flush();
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
        $conversation = Conversation::where('id', $id)
            ->where('source', 'widget')
            ->firstOrFail();

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
        $conversation = Conversation::where('id', $id)
            ->where('source', 'widget')
            ->firstOrFail();

        $transferService = new SupportTransferService();
        $result = $transferService->tryTransfer($conversation);

        return response()->json([
            'transferred' => $result['transferred'],
            'reason' => $result['reason'],
            'link' => $result['link'] ?? null,
        ]);
    }

    private function buildWidgetPrompt(string $context, ?string $customPrompt, WidgetSettings $settings): string
    {
        $base = $customPrompt
            ?? 'Voce e um assistente de suporte. Responda educadamente em markdown. Se nao souber, diga que nao tem certeza e sugira falar com o suporte humano.';

        $supportInfo = '';
        if ($settings->support_phone || $settings->support_link) {
            $supportInfo = "\n\nContato de suporte: " . ($settings->support_link ?? $settings->support_phone);
        }

        return $base . $supportInfo . "\n\n=== CONTEXTO DA BASE DE CONHECIMENTO ===\n" . $context . "\n=== FIM DO CONTEXTO ===";
    }
}