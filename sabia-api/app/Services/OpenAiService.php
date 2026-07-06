<?php

namespace App\Services;

use App\Models\AiProvider;
use App\Models\UsageLog;
use Illuminate\Http\StreamedResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class OpenAiService implements AiServiceInterface
{
    protected AiProvider $provider;
    protected string $baseUrl;
    protected array $defaultOptions;

    public function __construct(AiProvider $provider)
    {
        $this->provider = $provider;
        $this->baseUrl = $provider->endpoint ?? 'https://api.openai.com/v1';
        $this->defaultOptions = [
            'model' => 'gpt-4o-mini',
            'temperature' => 0.7,
            'max_tokens' => 2048,
            'stream' => true,
        ];
    }

    /**
     * @inheritDoc
     */
    public function chat(array $messages, array $options = []): StreamedResponse
    {
        $options = array_merge($this->defaultOptions, $options);
        
        return response()->stream(function () use ($messages, $options) {
            try {
                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$this->provider->api_key}",
                    'Content-Type' => 'application/json',
                    'Accept' => 'text/event-stream',
                ])
                ->timeout(60)
                ->post("{$this->baseUrl}/chat/completions", [
                    'messages' => $messages,
                    ...$options,
                ]);

                if ($response->failed()) {
                    Log::error('OpenAI API error', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);
                    
                    $this->sendErrorChunk('Erro na comunicação com a IA');
                    return;
                }

                $body = $response->body();
                $totalTokens = 0;
                $contentBuffer = '';

                // Processar stream SSE
                $lines = explode("\n", $body);
                foreach ($lines as $line) {
                    $line = trim($line);
                    
                    // Ignorar linhas vazias ou comentários
                    if (empty($line) || str_starts_with($line, ':')) {
                        continue;
                    }

                    // Remover prefixo "data: "
                    if (str_starts_with($line, 'data: ')) {
                        $line = substr($line, 6);
                    }

                    // Verificar fim do stream
                    if ($line === '[DONE]') {
                        break;
                    }

                    try {
                        $data = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
                        
                        if (isset($data['choices'][0]['delta']['content'])) {
                            $chunk = $data['choices'][0]['delta']['content'];
                            $contentBuffer .= $chunk;
                            
                            // Enviar chunk para o cliente
                            echo "data: " . json_encode([
                                'chunk' => $chunk,
                                'done' => false,
                            ]) . "\n\n";
                            
                            ob_flush();
                            flush();
                        }

                        // Capturar uso de tokens se disponível
                        if (isset($data['usage'])) {
                            $totalTokens = $data['usage']['total_tokens'] ?? 0;
                        }
                    } catch (\JsonException $e) {
                        Log::warning('Erro ao parsear JSON do stream', ['line' => $line]);
                        continue;
                    }
                }

                // Enviar sinal de conclusão
                $metadata = ['total_tokens' => $totalTokens ?: $this->countTokens($contentBuffer)];
                
                echo "data: " . json_encode([
                    'chunk' => '',
                    'done' => true,
                    'usage' => $metadata,
                ]) . "\n\n";

                // Callback de conclusão (persistir resposta do assistente)
                if (!empty($options['on_complete'])) {
                    call_user_func($options['on_complete'], $contentBuffer, $metadata);
                }

                // Registrar uso
                if ($totalTokens > 0 && auth()->check()) {
                    UsageLog::create([
                        'user_id' => auth()->id(),
                        'tokens_used' => $totalTokens,
                        'cost' => $this->calculateCost($totalTokens),
                        'provider' => 'openai',
                    ]);
                }

                ob_flush();
                flush();

            } catch (\Exception $e) {
                Log::error('Erro no streaming OpenAI', [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                
                $this->sendErrorChunk('Erro interno ao processar resposta da IA');
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no', // Desabilitar buffering no nginx
        ]);
    }

    /**
     * @inheritDoc
     */
    public function countTokens(string $text): int
    {
        // Estimativa simples: ~4 caracteres por token em média
        // Para produção, usar biblioteca tiktoken-php
        return (int) ceil(strlen($text) / 4);
    }

    /**
     * @inheritDoc
     */
    public function getModels(): array
    {
        return [
            ['id' => 'gpt-4o', 'name' => 'GPT-4o', 'context_window' => 128000],
            ['id' => 'gpt-4o-mini', 'name' => 'GPT-4o Mini', 'context_window' => 128000],
            ['id' => 'gpt-4-turbo', 'name' => 'GPT-4 Turbo', 'context_window' => 128000],
            ['id' => 'gpt-3.5-turbo', 'name' => 'GPT-3.5 Turbo', 'context_window' => 16385],
        ];
    }

    /**
     * @inheritDoc
     */
    public function isValid(): bool
    {
        if (empty($this->provider->api_key)) {
            return false;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->provider->api_key}",
            ])->get("{$this->baseUrl}/models");

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Erro ao validar OpenAI API key', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Calcula custo baseado nos tokens usados
     * Preços aproximados (ajustar conforme necessário)
     */
    protected function calculateCost(int $tokens): float
    {
        // GPT-4o Mini: $0.15 / 1M input tokens, $0.60 / 1M output tokens
        // Média simplificada: $0.00000060 por token
        return $tokens * 0.00000060;
    }

    /**
     * Envia chunk de erro formatado
     */
    protected function sendErrorChunk(string $message): void
    {
        echo "data: " . json_encode([
            'chunk' => '',
            'done' => true,
            'error' => $message,
        ]) . "\n\n";
        
        ob_flush();
        flush();
    }
}
