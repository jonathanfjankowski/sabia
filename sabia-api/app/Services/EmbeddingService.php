<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Cliente do sidecar Python de embeddings (BAAI/bge-m3, 1024 dims).
 *
 * Contrato: nunca lança exceção em falha de rede. Retorna [] para que o
 * caller degrade graciosamente (ArticleChunkService::process() pula o
 * chunk, VectorSearchService::search() retorna [] sem query).
 *
 * Config: config('services.embedding.url') — env EMBEDDING_URL.
 *         config('services.embedding.token') — env EMBEDDING_TOKEN (opcional;
 *         quando definido, o sidecar exige o mesmo token).
 */
class EmbeddingService
{
    private const DOWN_FLAG = 'embedding_sidecar.down';

    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.embedding.url'), '/');
    }

    public function embed(string $text): array
    {
        // Sidecar acabou de falhar: não paga timeout de novo a cada mensagem
        if (Cache::has(self::DOWN_FLAG)) {
            return [];
        }

        try {
            $r = $this->client()
                ->connectTimeout(2)
                ->timeout(10)
                ->post("{$this->baseUrl}/embed", ['text' => $text]);
        } catch (ConnectionException $e) {
            $this->markDown();

            return $this->logFail('embed', null, $e);
        }

        if ($r->ok()) {
            Cache::forget(self::DOWN_FLAG);

            return $r->json('vector') ?? [];
        }

        return $this->logFail('embed', $r);
    }

    public function embedBatch(array $texts): array
    {
        if (Cache::has(self::DOWN_FLAG)) {
            return [];
        }

        try {
            $r = $this->client()
                ->connectTimeout(2)
                ->timeout(60)
                ->post("{$this->baseUrl}/embed/batch", ['texts' => $texts]);
        } catch (ConnectionException $e) {
            $this->markDown();

            return $this->logFail('embed/batch', null, $e);
        }

        if ($r->ok()) {
            Cache::forget(self::DOWN_FLAG);

            return $r->json('vectors') ?? [];
        }

        // 413/422 = payload acima do limite do sidecar: não é queda, não
        // marca down — o caller cai no loop per-chunk
        return $this->logFail('embed/batch', $r);
    }

    public function isAvailable(): bool
    {
        try {
            return $this->client()->connectTimeout(2)->timeout(2)->get("{$this->baseUrl}/health")->ok();
        } catch (\Throwable) {
            return false;
        }
    }

    private function client(): PendingRequest
    {
        $token = (string) config('services.embedding.token');

        $request = Http::withHeaders([]);

        return $token !== '' ? $request->withToken($token) : $request;
    }

    private function markDown(): void
    {
        Cache::put(self::DOWN_FLAG, true, now()->addSeconds(60));
    }

    private function logFail(string $op, $response = null, ?\Throwable $e = null): array
    {
        app(SystemLogService::class)->log('error', 'embedding_sidecar', "sidecar {$op} failed", [
            'url' => $this->baseUrl,
            'status' => $response?->status(),
            'error' => $e?->getMessage() ?? $response?->body(),
        ]);

        return [];
    }
}
