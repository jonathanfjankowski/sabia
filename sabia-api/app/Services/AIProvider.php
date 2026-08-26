<?php

namespace App\Services;

use App\Models\AiSettings;
use Generator;
use Illuminate\Support\Facades\Http;

/**
 * Provedor de IA único — API compatível com OpenAI.
 *
 * Config (gestor fornece via Admin → Configurações → IA):
 *   endpoint — URL base (ex: https://api.openai.com/v1)
 *   api_key   — Token Bearer (criptografado em repouso na tabela ai_settings)
 *   model     — Modelo de chat completion (ex: gpt-4o, gemini-2.0-flash)
 *
 * Funciona com qualquer endpoint compatível com OpenAI:
 *   OpenAI, Groq, Together, Ollama (/v1), vLLM, llama.cpp, etc.
 */
class AIProvider
{
    private AiSettings $settings;

    public function __construct(AiSettings $settings)
    {
        $this->settings = $settings;
    }

    /**
     * Stream de chat completion. Retorna chunks de texto incrementais.
     *
     * @param array<int, array{role: string, content: string}> $history
     * @return Generator<int, string>
     */
    public function chat(string $message, string $systemPrompt, array $history = []): Generator
    {
        $endpoint = rtrim($this->settings->endpoint ?? '', '/') . '/chat/completions';

        $messages = array_merge(
            [['role' => 'system', 'content' => $systemPrompt]],
            $history,
            [['role' => 'user', 'content' => $message]]
        );

        $response = $this->http()
            ->withOptions(['stream' => true])
            ->timeout(120)
            ->post($endpoint, [
                'model' => $this->settings->model,
                'messages' => $messages,
                'temperature' => (float) $this->settings->temperature,
                'max_tokens' => (int) $this->settings->max_tokens,
                'stream' => true,
            ]);

        if (!$response->ok()) {
            $body = $response->body();
            app(SystemLogService::class)->log(
                'error',
                'ai.chat',
                "Provider returned {$response->status()}",
                ['body' => substr($body, 0, 1000)]
            );
            yield "[erro: provedor IA retornou {$response->status()}]";
            return;
        }

        foreach ($this->parseSse($response->body()) as $json) {
            $delta = $json['choices'][0]['delta']['content']
                ?? $json['choices'][0]['message']['content']
                ?? null;
            if ($delta !== null) {
                yield $delta;
            }
        }
    }

    /**
     * Stream de chat com análise de imagens.
     *
     * @param array<int, string> $images data URIs base64
     * @param array<int, array{role: string, content: string}> $history
     * @return Generator<int, string>
     */
    public function analyzeImages(string $message, array $images, string $systemPrompt, array $history = []): Generator
    {
        $endpoint = rtrim($this->settings->endpoint ?? '', '/') . '/chat/completions';

        $content = array_merge(
            [['type' => 'text', 'text' => $message]],
            array_map(fn ($data) => [
                'type' => 'image_url',
                'image_url' => ['url' => $data],
            ], $images)
        );

        $messages = array_merge(
            [['role' => 'system', 'content' => $systemPrompt]],
            $history,
            [['role' => 'user', 'content' => $content]]
        );

        $response = $this->http()
            ->withOptions(['stream' => true])
            ->timeout(120)
            ->post($endpoint, [
                'model' => $this->settings->model,
                'messages' => $messages,
                'temperature' => (float) $this->settings->temperature,
                'max_tokens' => (int) $this->settings->max_tokens,
                'stream' => true,
            ]);

        if (!$response->ok()) {
            $body = $response->body();
            app(SystemLogService::class)->log(
                'error',
                'ai.images',
                "Provider returned {$response->status()}",
                ['body' => substr($body, 0, 1000)]
            );
            yield "[erro: provedor IA retornou {$response->status()}]";
            return;
        }

        foreach ($this->parseSse($response->body()) as $json) {
            $delta = $json['choices'][0]['delta']['content']
                ?? $json['choices'][0]['message']['content']
                ?? null;
            if ($delta !== null) {
                yield $delta;
            }
        }
    }

    /** Gera vetor de embedding para um texto. */
    public function embed(string $text): array
    {
        $endpoint = rtrim($this->settings->endpoint ?? '', '/') . '/embeddings';
        $model = $this->settings->embedding_model ?: $this->settings->model;

        $response = $this->http()
            ->timeout(120)
            ->withOptions(['connect_timeout' => 30]) 
            ->post($endpoint, [
                'model' => $model,
                'input' => $text,
            ]);

        if (!$response->ok()) {
            app(SystemLogService::class)->log(
                'error',
                'ai.embed',
                "Embeddings endpoint returned {$response->status()}",
                ['body' => substr($response->body(), 0, 1000)]
            );
            return [];
        }

        return $response->json('data.0.embedding', []);
    }

    /** Gera um resumo curto de um texto longo. */
    public function summarize(string $text): string
    {
        $text = trim($text);
        if ($text === '') return '';

        $prompt = "Resuma o seguinte texto em até 2 frases em pt-BR:\n\n" . $text;
        $out = '';
        foreach ($this->chat($prompt, 'Você é um resumidor conciso.') as $chunk) {
            $out .= $chunk;
        }
        return $out;
    }

    private function http()
    {
        return Http::withToken($this->settings->api_key)
            ->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ]);
    }

    private function parseSse(string $body): \Generator
    {
        return (function () use ($body) {
            foreach (preg_split('/\R\R/', $body) as $chunk) {
                if (!str_starts_with($chunk, 'data:')) continue;
                $json = trim(substr($chunk, 5));
                if ($json === '[DONE]' || $json === '') continue;
                $decoded = json_decode($json, true);
                if (is_array($decoded)) {
                    yield $decoded;
                }
            }
        })();
    }
}
