<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\AiServiceFactory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

class MessageController extends Controller
{
    /**
     * Send a message to the conversation and start SSE streaming
     */
    public function send(Request $request, int $conversationId)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:50000',
        ]);

        $conversation = Conversation::where('user_id', $request->user()->id)
            ->findOrFail($conversationId);

        // Criar mensagem do usuário
        $userMessage = $conversation->messages()->create([
            'role' => 'user',
            'content' => $validated['content'],
            'token_count' => 0, // Será calculado depois
        ]);

        // Preparar histórico de mensagens para a IA
        $messages = $this->prepareMessages($conversation);

        // Obter serviço de IA
        try {
            $aiService = $this->getAiService($conversation);
        } catch (RuntimeException $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 503);
        }

        // Retornar stream SSE
        return $aiService->chat($messages, [
            'model' => $conversation->model ?? null,
        ]);
    }

    /**
     * Endpoint específico para streaming SSE
     * Pode ser usado diretamente pelo frontend com EventSource
     */
    public function stream(Request $request, int $messageId)
    {
        $message = Message::with('conversation')
            ->findOrFail($messageId);

        // Verificar permissão
        if ($message->conversation->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized');
        }

        $conversation = $message->conversation;
        $messages = $this->prepareMessages($conversation);

        try {
            $aiService = $this->getAiService($conversation);
        } catch (RuntimeException $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 503);
        }

        return $aiService->chat($messages, [
            'model' => $conversation->model ?? null,
        ]);
    }

    /**
     * Prepara mensagens no formato esperado pelos serviços de IA
     */
    protected function prepareMessages(Conversation $conversation): array
    {
        $messages = [];

        // Adicionar system prompt se existir
        if ($conversation->system_prompt) {
            $messages[] = [
                'role' => 'system',
                'content' => $conversation->system_prompt,
            ];
        }

        // Adicionar últimas mensagens (limitar para não exceder context window)
        $recentMessages = $conversation->messages()
            ->orderBy('created_at', 'desc')
            ->limit(20) // Últimas 20 mensagens
            ->get()
            ->reverse();

        foreach ($recentMessages as $msg) {
            $messages[] = [
                'role' => $msg->role,
                'content' => $msg->content,
            ];
        }

        return $messages;
    }

    /**
     * Obtém o serviço de IA apropriado para a conversa
     */
    protected function getAiService(Conversation $conversation): \App\Services\AiServiceInterface
    {
        // Se a conversa tem um provider específico, usar ele
        if ($conversation->ai_provider_id) {
            return AiServiceFactory::make($conversation->ai_provider_id);
        }

        // Caso contrário, usar o provider padrão
        return AiServiceFactory::default();
    }
}
