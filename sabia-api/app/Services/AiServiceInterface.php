<?php

namespace App\Services;

use Illuminate\Http\StreamedResponse;

interface AiServiceInterface
{
    /**
     * Envia mensagem para a IA e retorna resposta em streaming
     *
     * Opções suportadas:
     * - model: string - modelo a usar
     * - temperature: float - temperatura (0-1)
     * - max_tokens: int - max tokens
     * - on_complete: callable(string $fullResponse, array $metadata) - callback quando stream terminar
     *
     * @param array $messages Array de mensagens no formato [{role, content}]
     * @param array $options Opções adicionais
     * @return StreamedResponse
     */
    public function chat(array $messages, array $options = []): StreamedResponse;

    /**
     * Conta tokens de um texto
     */
    public function countTokens(string $text): int;

    /**
     * Retorna lista de modelos disponíveis
     */
    public function getModels(): array;

    /**
     * Valida se a API key está configurada
     */
    public function isValid(): bool;
}
