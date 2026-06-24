<?php

namespace App\Services;

use Illuminate\Http\StreamedResponse;

interface AiServiceInterface
{
    /**
     * Envia mensagem para a IA e retorna resposta em streaming
     *
     * @param array $messages Array de mensagens no formato [{role, content}]
     * @param array $options Opções adicionais (modelo, temperatura, etc)
     * @return StreamedResponse
     */
    public function chat(array $messages, array $options = []): StreamedResponse;

    /**
     * Conta tokens de um texto
     *
     * @param string $text
     * @return int
     */
    public function countTokens(string $text): int;

    /**
     * Retorna lista de modelos disponíveis
     *
     * @return array
     */
    public function getModels(): array;

    /**
     * Valida se a API key está configurada
     *
     * @return bool
     */
    public function isValid(): bool;
}
