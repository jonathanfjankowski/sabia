<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate', ['--seed' => true]);

        // O chat faz embed da pergunta antes de streamar: sem fake, os testes
        // chamariam o sidecar REAL (e o 503 de "embedding vazio" dispararia
        // conforme a disponibilidade dele ou da flag embedding_sidecar.down).
        // Mesmo fake do RagTest — responde N vetores conforme o request.
        $vector = fn () => array_fill(0, 1024, 0.1);
        Http::fake([
            '*/embed/batch' => function ($request) use ($vector) {
                $texts = $request['texts'] ?? [];

                return Http::response(['vectors' => array_map($vector, $texts)]);
            },
            '*/embed' => Http::response([
                'vector' => $vector(),
                'dimensions' => 1024,
            ]),
        ]);
    }

    public function test_chat_returns_sse_stream(): void
    {
        $user = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        Profile::factory()->create(['user_id' => $user->id, 'role' => 'gestor', 'is_active' => true]);
        $token = $user->createToken('test', ['internal'])->plainTextToken;

        $response = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->post('/api/chat', [
                'message' => 'Test message',
            ]);

        $response->assertStatus(200)
            ->assertHeader('X-Accel-Buffering', 'no');
        // Symfony anexa "private" ao no-cache em respostas streamadas
        $this->assertStringContainsString(
            'no-cache',
            (string) $response->headers->get('Cache-Control')
        );
        // Content-Type chega com charset anexado — validar por prefixo
        $this->assertStringContainsString(
            'text/event-stream',
            (string) $response->headers->get('Content-Type')
        );
    }

    public function test_widget_chat_returns_sse_stream(): void
    {
        $user = User::factory()->create(['email' => 'widget@test.com', 'password' => Hash::make('pass')]);
        Profile::factory()->create(['user_id' => $user->id, 'role' => 'operador', 'is_active' => true]);
        $token = $user->createToken('widget', ['widget'])->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'X-Session-Id' => 'test-session-123',
        ])->post('/api/widget/chat', [
            'message' => 'Test widget message',
        ]);

        $response->assertStatus(200);
        $this->assertStringContainsString(
            'no-cache',
            (string) $response->headers->get('Cache-Control')
        );
        $this->assertStringContainsString(
            'text/event-stream',
            (string) $response->headers->get('Content-Type')
        );
    }

    public function test_admin_test_prompt_returns_sse(): void
    {
        $user = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        Profile::factory()->create(['user_id' => $user->id, 'role' => 'gestor', 'is_active' => true]);
        $token = $user->createToken('test', ['gestor'])->plainTextToken;

        $response = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->post('/api/admin/settings/ai/test-prompt', [
                'system_prompt' => 'Test prompt',
                'test_message' => 'Hello',
            ]);

        $response->assertStatus(200);
        $this->assertStringContainsString(
            'text/event-stream',
            (string) $response->headers->get('Content-Type')
        );
    }
}
