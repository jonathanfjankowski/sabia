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
    protected string $contentBuffer = '';
    protected array $streamOptions = [];

    public function __construct(AiProvider $provider)
    {
        $this->provider = $provider;
        $this->baseUrl = $provider->endpoint ?? 'https://api.anthropic.com';
        $this->defaultOptions = [
            'model' => 'claude-3-haiku-20240307',
            'max_tokens' => 2048,
        ];
    }

    public function chat(array $messages, array $options = []): StreamedResponse
    {
        $options = array_merge($this->defaultOptions, $options);
        $this->streamOptions = $options;
        $this->contentBuffer = '';

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
        
        return response()->stream(function () use ($formattedMessages, $systemMessage) {
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
                    'model' => $this->streamOptions['model'] ?? $this->defaultOptions['model'],
                    'max_tokens' => $this->streamOptions['max_tokens'] ?? 2048,
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

                $lines = explode("\n", $body);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if (empty($line) || !str_starts_with($line, 'data: ')) continue;

                    $dataStr = substr($line, 6);
                    try {
                        $data = json_decode($dataStr, true, 512, JSON_THROW_ON_ERROR);
                        $eventType = $data['type'] ?? '';

                        match ($eventType) {
                            'content_block_delta' => $this->handleContentDelta($data),
                            'message_delta' => $this->handleMessageDelta($data, $totalTokens),
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

    protected function handleContentDelta(array $data): void
    {
        if (isset($data['delta']['text'])) {
            $chunk = $data['delta']['text'];
            $this->contentBuffer .= $chunk;
            
            echo "data: " . json_encode([
                'chunk' => $chunk,
                'done' => false,
            ]) . "\n\n";
            
            ob_flush();
            flush();
        }
    }

    protected function handleMessageDelta(array $data, int &$totalTokens): void
    {
        if (isset($data['usage']['output_tokens'])) {
            $totalTokens = $data['usage']['output_tokens'];
        }
    }

    protected function handleMessageStop(int $totalTokens): void
    {
        $metadata = ['total_tokens' => $totalTokens];
        
        echo "data: " . json_encode([
            'chunk' => '',
            'done' => true,
            'usage' => $metadata,
        ]) . "\n\n";

        // Callback de conclusão
        if (!empty($this->streamOptions['on_complete'])) {
            call_user_func($this->streamOptions['on_complete'], $this->contentBuffer, $metadata);
        }

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

    public function countTokens(string $text): int
    {
        return (int) ceil(strlen($text) / 4);
    }

    public function getModels(): array
    {
        return [
            ['id' => 'claude-3-opus-20240229', 'name' => 'Claude 3 Opus', 'context_window' => 200000],
            ['id' => 'claude-3-sonnet-20240229', 'name' => 'Claude 3 Sonnet', 'context_window' => 200000],
            ['id' => 'claude-3-haiku-20240307', 'name' => 'Claude 3 Haiku', 'context_window' => 200000],
            ['id' => 'claude-3-5-sonnet-20241022', 'name' => 'Claude 3.5 Sonnet', 'context_window' => 200000],
        ];
    }

    public function isValid(): bool
    {
        if (empty($this->provider->api_key)) return false;
        try {
            return Http::withHeaders(['x-api-key' => $this->provider->api_key, 'anthropic-version' => '2023-06-01'])
                ->get("{$this->baseUrl}/v1/models")->successful();
        } catch (\Exception $e) {
            Log::error('Erro ao validar Anthropic API key', ['error' => $e->getMessage()]);
            return false;
        }
    }

    protected function calculateCost(int $tokens): float
    {
        return $tokens * 0.000001;
    }

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
