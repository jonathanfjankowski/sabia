<?php

namespace App\Services;

use App\Models\AiProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EmbeddingService
{
    protected ?AiProvider $provider = null;

    public function __construct(?AiProvider $provider = null)
    {
        $this->provider = $provider;
    }

    /**
     * Gera embedding para um texto usando o provedor configurado
     *
     * @param string $text
     * @return array Array de floats (768 dimensões)
     */
    public function generateEmbedding(string $text): array
    {
        $provider = $this->provider ?? AiProvider::where('is_active', true)->first();

        if (!$provider) {
            // Fallback: embedding simulado (apenas para desenvolvimento)
            return $this->simulateEmbedding($text);
        }

        try {
            return match ($provider->name) {
                'openai' => $this->openAiEmbedding($provider, $text),
                'google' => $this->googleEmbedding($provider, $text),
                'anthropic' => $this->simulateEmbedding($text),
                default => $this->simulateEmbedding($text),
            };
        } catch (\Exception $e) {
            Log::error('Erro ao gerar embedding', [
                'provider' => $provider->name,
                'error' => $e->getMessage(),
            ]);
            return $this->simulateEmbedding($text);
        }
    }

    /**
     * Gera embedding usando OpenAI
     */
    protected function openAiEmbedding(AiProvider $provider, string $text): array
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$provider->api_key}",
            'Content-Type' => 'application/json',
        ])->post('https://api.openai.com/v1/embeddings', [
            'model' => 'text-embedding-3-small',
            'input' => $text,
            'dimensions' => 768,
        ]);

        if ($response->failed()) {
            throw new \Exception('OpenAI embedding failed: ' . $response->body());
        }

        return $response->json('data.0.embedding');
    }

    /**
     * Gera embedding usando Google Gemini
     */
    protected function googleEmbedding(AiProvider $provider, string $text): array
    {
        $response = Http::post(
            "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key={$provider->api_key}",
            [
                'model' => 'models/embedding-001',
                'content' => ['parts' => [['text' => $text]]],
            ]
        );

        if ($response->failed()) {
            throw new \Exception('Google embedding failed: ' . $response->body());
        }

        return $response->json('embedding.values');
    }

    /**
     * Embedding simulado para desenvolvimento (sem API key)
     * Gera um vetor pseudo-aleatório determinístico baseado no texto
     */
    public function simulateEmbedding(string $text): array
    {
        $dimensions = 768;
        $embedding = [];
        $hash = crc32($text);

        for ($i = 0; $i < $dimensions; $i++) {
            $value = sin($hash * ($i + 1)) * cos($hash * ($i * 0.5 + 1));
            $embedding[] = round($value, 6);
        }

        // Normalizar
        $magnitude = sqrt(array_sum(array_map(function ($v) { return $v * $v; }, $embedding)));
        if ($magnitude > 0) {
            $embedding = array_map(function ($v) use ($magnitude) {
                return $v / $magnitude;
            }, $embedding);
        }

        return $embedding;
    }

    /**
     * Calcula similaridade coseno entre dois vetores
     */
    public static function cosineSimilarity(array $a, array $b): float
    {
        $dotProduct = 0;
        $normA = 0;
        $normB = 0;

        for ($i = 0; $i < count($a); $i++) {
            $dotProduct += $a[$i] * $b[$i];
            $normA += $a[$i] * $a[$i];
            $normB += $b[$i] * $b[$i];
        }

        $denominator = sqrt($normA) * sqrt($normB);
        return $denominator > 0 ? $dotProduct / $denominator : 0;
    }
}
