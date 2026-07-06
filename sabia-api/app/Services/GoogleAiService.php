<?php

namespace App\Services;

use App\Models\AiProvider;
use App\Models\UsageLog;
use Illuminate\Http\StreamedResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleAiService implements AiServiceInterface
{
    protected AiProvider $provider;
    protected string $baseUrl;
    protected array $defaultOptions;

    public function __construct(AiProvider $provider)
    {
        $this->provider = $provider;
        $this->baseUrl = $provider->endpoint ?? 'https://generativelanguage.googleapis.com/v1beta';
        $this->defaultOptions = [
            'model' => 'gemini-1.5-flash',
        ];
    }

    /**
     * @inheritDoc
     */
    public function chat(array $messages, array $options = []): StreamedResponse
    {
        $options = array_merge($this->defaultOptions, $options);
        $model = $options['model'] ?? $this->defaultOptions['model'];
        
        // Google usa formato diferente de mensagens
        $contents = $this->formatMessages($messages);
        
        return response()->stream(function () use ($contents, $model, $options) {
            try {
                $url = "{$this->baseUrl}/models/{$model}:streamGenerateContent?key={$this->provider->api_key}&alt=sse";
                
                $response = Http::withHeaders([
                    'Content-Type' => 'application/json',
                ])
                ->timeout(60)
                ->post($url, [
                    'contents' => $contents,
                    'generationConfig' => [
                        'temperature' => 0.7,
                        'maxOutputTokens' => 2048,
                    ],
                ]);

                if ($response->failed()) {
                    Log::error('Google AI API error', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);
                    
                    $this->sendErrorChunk('Erro na comunicação com a IA');
                    return;
                }

                $body = $response->body();
                $totalTokens = 0;
                $contentBuffer = '';

                // Processar stream SSE do Google
                $lines = explode("\n", $body);
                foreach ($lines as $line) {
                    $line = trim($line);
                    
                    if (empty($line) || !str_starts_with($line, 'data: ')) {
                        continue;
                    }

                    $dataStr = substr($line, 6);
                    
                    try {
                        // Google retorna array de respostas
                        $chunks = json_decode($dataStr, true, 512, JSON_THROW_ON_ERROR);
                        
                        if (!is_array($chunks)) {
                            continue;
                        }

                        foreach ($chunks as $chunk) {
                            if (isset($chunk['candidates'][0]['content']['parts'][0]['text'])) {
                                $text = $chunk['candidates'][0]['content']['parts'][0]['text'];
                                $contentBuffer .= $text;
                                
                                echo "data: " . json_encode([
                                    'chunk' => $text,
                                    'done' => false,
                                ]) . "\n\n";
                                
                                ob_flush();
                                flush();
                            }

                            // Capturar uso de tokens
                            if (isset($chunk['usageMetadata'])) {
                                $totalTokens = $chunk['usageMetadata']['totalTokenCount'] ?? 0;
                            }
                        }
                    } catch (\JsonException $e) {
                        Log::warning('Erro ao parsear JSON do stream Google', ['line' => $line]);
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
                        'provider' => 'google',
                    ]);
                }

                ob_flush();
                flush();

            } catch (\Exception $e) {
                Log::error('Erro no streaming Google AI', [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                
                $this->sendErrorChunk('Erro interno ao processar resposta da IA');
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Formata mensagens para o padrão Google
     */
    protected function formatMessages(array $messages): array
    {
        $contents = [];
        
        foreach ($messages as $msg) {
            // Pular system message (Google não suporta nativamente)
            if ($msg['role'] === 'system') {
                continue;
            }
            
            $contents[] = [
                'role' => $msg['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [
                    ['text' => $msg['content']],
                ],
            ];
        }
        
        return $contents;
    }

    /**
     * @inheritDoc
     */
    public function countTokens(string $text): int
    {
        // Estimativa simples para Google
        return (int) ceil(strlen($text) / 4);
    }

    /**
     * @inheritDoc
     */
    public function getModels(): array
    {
        return [
            ['id' => 'gemini-1.5-pro', 'name' => 'Gemini 1.5 Pro', 'context_window' => 2000000],
            ['id' => 'gemini-1.5-flash', 'name' => 'Gemini 1.5 Flash', 'context_window' => 1000000],
            ['id' => 'gemini-1.0-pro', 'name' => 'Gemini 1.0 Pro', 'context_window' => 32000],
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
            $response = Http::get("{$this->baseUrl}/models?key={$this->provider->api_key}");

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Erro ao validar Google AI API key', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Calcula custo baseado nos tokens usados
     * Gemini 1.5 Flash: gratuito até certo limite, depois ~$0.000000375 por token
     */
    protected function calculateCost(int $tokens): float
    {
        return $tokens * 0.000000375;
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
