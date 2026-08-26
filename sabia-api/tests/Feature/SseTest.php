<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate', ['--seed' => true]);
    }

    public function test_chat_returns_sse_stream(): void
    {
        $user = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        Profile::factory()->create(['user_id' => $user->id, 'role' => 'gestor', 'is_active' => true]);
        $token = $user->createToken('test', ['internal'])->plainTextToken;

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->post('/api/chat', [
                'message' => 'Test message',
            ]);

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'text/event-stream')
            ->assertHeader('Cache-Control', 'no-cache')
            ->assertHeader('X-Accel-Buffering', 'no');
    }

    public function test_widget_chat_returns_sse_stream(): void
    {
        $user = User::factory()->create(['email' => 'widget@test.com', 'password' => Hash::make('pass')]);
        Profile::factory()->create(['user_id' => $user->id, 'role' => 'operador', 'is_active' => true]);
        $token = $user->createToken('widget', ['widget'])->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Session-Id' => 'test-session-123',
        ])->post('/api/widget/chat', [
            'message' => 'Test widget message',
        ]);

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'text/event-stream')
            ->assertHeader('Cache-Control', 'no-cache');
    }

    public function test_admin_test_prompt_returns_sse(): void
    {
        $user = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        Profile::factory()->create(['user_id' => $user->id, 'role' => 'gestor', 'is_active' => true]);
        $token = $user->createToken('test', ['gestor'])->plainTextToken;

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->post('/api/admin/settings/ai/test-prompt', [
                'system_prompt' => 'Test prompt',
                'test_message' => 'Hello',
            ]);

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'text/event-stream');
    }
}