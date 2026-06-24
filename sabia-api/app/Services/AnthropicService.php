<?php

namespace App\Services;

use App\Models\AiProvider;
use App\Models\UsageLog;
use Illuminate\Http\StreamedResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AnthropicService implements AiServiceInterface
{
    protected AiProvider $provider;
    protected string $baseUrl;
    protected array $defaultOptions;

    public function __construct(AiProvider $provider)
    {
        $this->provider = $provider;
        $this->baseUrl = $provider->endpoint ?? 'https://api.anthropic.com';
        $this->defaultOptions = [
            'model' => 'claude-3-haiku-20240307',
            'max_tokens' => 2048,
        ];
    }

    /**
     * @inheritDoc
     */
    public function chat(array $messages, array $options = []): StreamedResponse
    {
        $options = array_merge($this->defaultOptions, $options);
        
        // Anthropic usa formato diferente: system message separada
        $systemMessage = '';
        $formattedMessages = [];
        
        foreach ($messages as $msg) {
            if ($msg['role'] === 'system') {
                $systemMessage = $msg['content'];
            } else {
                $formattedMessages[] = [
                    'role' => $msg['role'],
                    'content' => $msg['content'],
                ];
            }
        }
        
        return response()->stream(function () use ($formattedMessages, $systemMessage, $options) {
            try {
                $response = Http::withHeaders([
                    'x-api-key' => $this->provider->api_key,
                    'Content-Type' => 'application/json',
                    'anthropic-version' => '2023-06-01',
                    'Accept' => 'text/event-stream',
                ])
                ->timeout(60)
                ->post("{$this->baseUrl}/v1/messages", [
                    'messages' => $formattedMessages,
                    'system' => $systemMessage,
                    'stream' => true,
                    ...$options,
                ]);

                if ($response->failed()) {
                    Log::error('Anthropic API error', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);
                    
                    $this->sendErrorChunk('Erro na comunicação com a IA');
                    return;
                }

                $body = $response->body();
                $totalTokens = 0;
                $contentBuffer = '';

                // Processar stream SSE da Anthropic
                $lines = explode("\n", $body);
                foreach ($lines as $line) {
                    $line = trim($line);
                    
                    if (empty($line) || !str_starts_with($line, 'data: ')) {
                        continue;
                    }

                    $dataStr = substr($line, 6);
                    
                    try {
                        $data = json_decode($dataStr, true, 512, JSON_THROW_ON_ERROR);
                        $eventType = $data['type'] ?? '';

                        match ($eventType) {
                            'content_block_delta' => $this->handleContentDelta($data, $contentBuffer),
                            'message_delta' => $this->handleMessageDelta($data, $contentBuffer, $totalTokens),
                            'message_stop' => $this->handleMessageStop($totalTokens),
                            'error' => $this->sendErrorChunk($data['error']['message'] ?? 'Erro desconhecido'),
                            default => null,
                        };
                    } catch (\JsonException $e) {
                        Log::warning('Erro ao parsear JSON do stream Anthropic', ['line' => $line]);
                        continue;
                    }
                }

                ob_flush();
                flush();

            } catch (\Exception $e) {
                Log::error('Erro no streaming Anthropic', [
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
     * Handle content delta events
     */
    protected function handleContentDelta(array $data, string &$contentBuffer): void
    {
        if (isset($data['delta']['text'])) {
            $chunk = $data['delta']['text'];
            $contentBuffer .= $chunk;
            
            echo "data: " . json_encode([
                'chunk' => $chunk,
                'done' => false,
            ]) . "\n\n";
            
            ob_flush();
            flush();
        }
    }

    /**
     * Handle message delta events (usage stats)
     */
    protected function handleMessageDelta(array $data, string &$contentBuffer, int &$totalTokens): void
    {
        if (isset($data['usage']['output_tokens'])) {
            $totalTokens = $data['usage']['output_tokens'];
        }
    }

    /**
     * Handle message stop event
     */
    protected function handleMessageStop(int $totalTokens): void
    {
        echo "data: " . json_encode([
            'chunk' => '',
            'done' => true,
            'usage' => ['total_tokens' => $totalTokens],
        ]) . "\n\n";

        // Registrar uso
        if ($totalTokens > 0 && auth()->check()) {
            UsageLog::create([
                'user_id' => auth()->id(),
                'tokens_used' => $totalTokens,
                'cost' => $this->calculateCost($totalTokens),
                'provider' => 'anthropic',
            ]);
        }
        
        ob_flush();
        flush();
    }

    /**
     * @inheritDoc
     */
    public function countTokens(string $text): int
    {
        // Estimativa simples para Anthropic
        return (int) ceil(strlen($text) / 4);
    }

    /**
     * @inheritDoc
     */
    public function getModels(): array
    {
        return [
            ['id' => 'claude-3-opus-20240229', 'name' => 'Claude 3 Opus', 'context_window' => 200000],
            ['id' => 'claude-3-sonnet-20240229', 'name' => 'Claude 3 Sonnet', 'context_window' => 200000],
            ['id' => 'claude-3-haiku-20240307', 'name' => 'Claude 3 Haiku', 'context_window' => 200000],
            ['id' => 'claude-3-5-sonnet-20241022', 'name' => 'Claude 3.5 Sonnet', 'context_window' => 200000],
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
                'x-api-key' => $this->provider->api_key,
                'anthropic-version' => '2023-06-01',
            ])->get("{$this->baseUrl}/v1/models");

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Erro ao validar Anthropic API key', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Calcula custo baseado nos tokens usados
     * Preços aproximados Claude 3 Haiku: $0.00025 / 1K input, $0.00125 / 1K output
     */
    protected function calculateCost(int $tokens): float
    {
        // Média simplificada: $0.000001 por token
        return $tokens * 0.000001;
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
