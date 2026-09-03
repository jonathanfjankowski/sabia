<?php

namespace Tests\Feature;

use App\Services\EmbeddingService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EmbeddingServiceTest extends TestCase
{
    public function test_embed_chama_sidecar_e_retorna_vetor(): void
    {
        Http::fake([
            '*/embed' => Http::response([
                'vector' => array_fill(0, 1024, 0.5),
                'dimensions' => 1024,
            ]),
        ]);

        $vector = app(EmbeddingService::class)->embed('como funciona o plano?');

        $this->assertCount(1024, $vector);
        $expectedUrl = rtrim(config('services.embedding.url'), '/').'/embed';
        Http::assertSent(fn ($request) => $request->url() === $expectedUrl
            && $request['text'] === 'como funciona o plano?');
    }

    public function test_embed_batch_chama_batch_e_retorna_vetores(): void
    {
        Http::fake([
            '*/embed/batch' => Http::response([
                'vectors' => [array_fill(0, 1024, 0.1), array_fill(0, 1024, 0.2)],
            ]),
        ]);

        $vectors = app(EmbeddingService::class)->embedBatch(['a', 'b']);

        $this->assertCount(2, $vectors);
        $this->assertCount(1024, $vectors[0]);
    }

    public function test_embed_retorna_vazio_em_falha_de_conexao(): void
    {
        Http::fake(function () {
            throw new ConnectionException('sidecar down');
        });

        $this->assertSame([], app(EmbeddingService::class)->embed('x'));
    }

    public function test_embed_retorna_vazio_em_resposta_erro(): void
    {
        Http::fake(['*/embed' => Http::response('boom', 500)]);

        $this->assertSame([], app(EmbeddingService::class)->embed('x'));
    }

    public function test_is_available_falso_quado_health_falha(): void
    {
        Http::fake(function () {
            throw new ConnectionException('down');
        });

        $this->assertFalse(app(EmbeddingService::class)->isAvailable());
    }

    public function test_is_available_verdadeiro_com_health_ok(): void
    {
        Http::fake(['*/health' => Http::response(['ok' => true])]);

        $this->assertTrue(app(EmbeddingService::class)->isAvailable());
    }
}
