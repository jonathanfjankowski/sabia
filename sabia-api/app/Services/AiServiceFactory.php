<?php

namespace App\Services;

use App\Models\AiProvider;
use Illuminate\Http\StreamedResponse;
use RuntimeException;

class AiServiceFactory
{
    /**
     * Cria uma instância do serviço de IA baseado no provider
     *
     * @param AiProvider|int|string $provider Provider model, ID ou nome
     * @return AiServiceInterface
     * @throws RuntimeException
     */
    public static function make(AiProvider|int|string $provider): AiServiceInterface
    {
        // Se for um modelo AiProvider
        if ($provider instanceof AiProvider) {
            return self::createFromModel($provider);
        }

        // Se for um ID numérico
        if (is_numeric($provider)) {
            $providerModel = AiProvider::find($provider);
            if (!$providerModel) {
                throw new RuntimeException("Provider com ID {$provider} não encontrado");
            }
            return self::createFromModel($providerModel);
        }

        // Se for um nome/string
        if (is_string($provider)) {
            $providerModel = AiProvider::where('name', strtolower($provider))->first();
            if (!$providerModel) {
                throw new RuntimeException("Provider '{$provider}' não encontrado");
            }
            return self::createFromModel($providerModel);
        }

        throw new RuntimeException("Tipo de provider inválido");
    }

    /**
     * Cria serviço a partir do modelo AiProvider
     *
     * @param AiProvider $provider
     * @return AiServiceInterface
     * @throws RuntimeException
     */
    protected static function createFromModel(AiProvider $provider): AiServiceInterface
    {
        if (!$provider->is_active) {
            throw new RuntimeException("Provider '{$provider->name}' está inativo");
        }

        return match ($provider->name) {
            'openai' => new OpenAiService($provider),
            'anthropic' => new AnthropicService($provider),
            'google' => new GoogleAiService($provider),
            default => throw new RuntimeException("Provider '{$provider->name}' não é suportado"),
        };
    }

    /**
     * Retorna o provider padrão (primeiro ativo)
     *
     * @return AiServiceInterface
     * @throws RuntimeException
     */
    public static function default(): AiServiceInterface
    {
        $provider = AiProvider::where('is_active', true)->first();
        
        if (!$provider) {
            throw new RuntimeException("Nenhum provider de IA configurado e ativo");
        }

        return self::make($provider);
    }

    /**
     * Lista todos os serviços disponíveis
     *
     * @return array
     */
    public static function availableProviders(): array
    {
        return AiProvider::where('is_active', true)
            ->get()
            ->pluck('name')
            ->toArray();
    }
}
