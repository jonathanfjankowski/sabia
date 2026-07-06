<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\WidgetSetting;
use App\Models\AiSetting;
use App\Services\AiServiceFactory;
use App\Services\PromptInjectionDetector;
use App\Services\VectorSearchService;
use App\Services\ConfidenceEvaluator;
use App\Services\EmbeddingService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WidgetChatController extends Controller
{
    protected PromptInjectionDetector $injectionDetector;
    protected VectorSearchService $vectorSearch;
    protected ConfidenceEvaluator $confidenceEvaluator;

    public function __construct()
    {
        $this->injectionDetector = new PromptInjectionDetector();
        $embeddingService = new EmbeddingService();
        $this->vectorSearch = new VectorSearchService($embeddingService);
        $this->confidenceEvaluator = new ConfidenceEvaluator();
    }

    /**
     * Get widget config (public)
     */
    public function config()
    {
        $widget = WidgetSetting::getActive();
        $brand = \App\Models\BrandSetting::getActive();

        if ($widget->isInMaintenance()) {
            return response()->json([
                'maintenance' => true,
                'message' => $widget->maintenance_message,
                'app_name' => $brand->app_name,
            ]);
        }

        return response()->json([
            'maintenance' => false,
            'welcome_message' => $widget->welcome_message,
            'app_name' => $brand->app_name,
            'primary_color' => $brand->primary_color,
            'secondary_color' => $brand->secondary_color,
            'logo_url' => $brand->logo_url,
            'font' => $brand->font,
            'support_link' => $widget->support_link,
            'support_phone' => $widget->support_phone,
            'within_business_hours' => $widget->isWithinBusinessHours(),
            'out_of_hours_message' => $widget->out_of_hours_message,
        ]);
    }

    /**
     * Send message via widget (public, session-based)
     */
    public function chat(Request $request)
    {
        $widget = WidgetSetting::getActive();

        if ($widget->isInMaintenance()) {
            return response()->json(['error' => $widget->maintenance_message], 503);
        }

        $validated = $request->validate([
            'content' => 'required|string|max:5000',
            'session_id' => 'nullable|string',
        ]);

        // Obter ou criar sessão
        $sessionId = $validated['session_id'] ?? Str::uuid()->toString();
        $conversation = Conversation::firstOrCreate(
            ['session_id' => $sessionId, 'source' => 'widget'],
            [
                'session_id' => $sessionId,
                'access_level' => 'public',
                'source' => 'widget',
                'title' => 'Widget: ' . mb_substr($validated['content'], 0, 40),
            ]
        );

        // Delegar para MessageController (versão simplificada)
        $userMessage = $validated['content'];

        // Salvar mensagem do usuário
        $conversation->messages()->create([
            'role' => 'user',
            'content' => $userMessage,
        ]);

        // Buscar RAG
        $aiSettings = AiSetting::getActive();
        $searchResults = collect();
        if ($aiSettings->enable_rag ?? true) {
            $searchResults = $this->vectorSearch->search($userMessage, $aiSettings->top_k ?? 3, 'public');
        }

        $ragContext = '';
        $citations = [];
        foreach ($searchResults as $result) {
            $ragContext .= "[{$result['article_title']}]\n{$result['content']}\n\n";
        }

        $confidence = $this->confidenceEvaluator->evaluate(
            $searchResults->toArray(),
            $aiSettings->confidence_threshold ?? 0.75
        );

        // Construir system prompt
        $systemPrompt = $aiSettings->system_prompt ?? "Você é o Sabiá, assistente virtual da Bsoft TMS.";
        $systemPrompt .= "\n\nResponda APENAS sobre Bsoft TMS. Use markdown. Seja breve e direto.";
        if ($ragContext) {
            $systemPrompt .= "\n\nContexto:\n{$ragContext}";
        }
        if ($confidence['level'] === 'none') {
            $systemPrompt .= "\n\nSe não souber responder, sugira contato com suporte humano.";
        }

        // Preparar mensagens
        $history = $conversation->messages()->orderBy('created_at')->limit(10)->get();
        $messages = [['role' => 'system', 'content' => $systemPrompt]];
        foreach ($history as $msg) {
            $messages[] = ['role' => $msg->role, 'content' => $msg->content];
        }

        // Obter serviço IA
        try {
            $aiService = AiServiceFactory::default();
        } catch (\RuntimeException $e) {
            return response()->json(['error' => 'IA não configurada'], 503);
        }

        $onComplete = function (string $fullResponse, array $metadata) use ($conversation, $citations, $confidence) {
            $conversation->messages()->create([
                'role' => 'assistant',
                'content' => $fullResponse,
                'citations' => !empty($citations) ? $citations : null,
                'confidence_score' => $confidence['top_score'] ?? null,
            ]);
        };

        return $aiService->chat($messages, [
            'on_complete' => $onComplete,
            'session_id' => $sessionId,
        ]);
    }
}
