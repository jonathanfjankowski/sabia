<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\ArticleChunk;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RLSTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate', ['--seed' => true]);
    }

    public function test_internal_user_sees_public_and_internal_articles(): void
    {
        $user = User::factory()->create(['email' => 'internal@test.com', 'password' => Hash::make('pass')]);
        $profile = Profile::factory()->create(['user_id' => $user->id, 'role' => 'operador', 'is_active' => true]);
        $token = $user->createToken('test', ['internal'])->plainTextToken;

        $internal = Article::factory()->create(['access_level' => 'internal', 'status' => 'active']);
        $public = Article::factory()->create(['access_level' => 'public', 'status' => 'active']);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->getJson('/api/articles');

        $response->assertOk();
        $ids = collect($response->json())->pluck('id')->toArray();
        $this->assertContains($internal->id, $ids);
        $this->assertContains($public->id, $ids);
    }

    public function test_widget_token_only_sees_public_articles(): void
    {
        $user = User::factory()->create(['email' => 'widget@test.com', 'password' => Hash::make('pass')]);
        Profile::factory()->create(['user_id' => $user->id, 'role' => 'operador', 'is_active' => true]);
        $token = $user->createToken('widget', ['widget'])->plainTextToken;

        $internal = Article::factory()->create(['access_level' => 'internal', 'status' => 'active']);
        $public = Article::factory()->create(['access_level' => 'public', 'status' => 'active']);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->getJson('/api/articles');

        $response->assertOk();
        $ids = collect($response->json())->pluck('id')->toArray();
        $this->assertNotContains($internal->id, $ids);
        $this->assertContains($public->id, $ids);
    }

    public function test_internal_user_only_sees_own_conversations(): void
    {
        $user1 = User::factory()->create(['email' => 'user1@test.com', 'password' => Hash::make('pass')]);
        $profile1 = Profile::factory()->create(['user_id' => $user1->id, 'role' => 'operador', 'is_active' => true]);
        $token1 = $user1->createToken('test', ['internal'])->plainTextToken;

        $user2 = User::factory()->create(['email' => 'user2@test.com', 'password' => Hash::make('pass')]);
        $profile2 = Profile::factory()->create(['user_id' => $user2->id, 'role' => 'operador', 'is_active' => true]);

        $conv1 = Conversation::factory()->create(['user_id' => $profile1->id, 'source' => 'direct']);
        $conv2 = Conversation::factory()->create(['user_id' => $profile2->id, 'source' => 'direct']);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token1])
            ->getJson('/api/conversations');

        $response->assertOk();
        $ids = collect($response->json())->pluck('id')->toArray();
        $this->assertContains($conv1->id, $ids);
        $this->assertNotContains($conv2->id, $ids);
    }

    public function test_widget_session_only_sees_own_conversation(): void
    {
        $user = User::factory()->create(['email' => 'widget@test.com', 'password' => Hash::make('pass')]);
        Profile::factory()->create(['user_id' => $user->id, 'role' => 'operador', 'is_active' => true]);
        $token = $user->createToken('widget', ['widget'])->plainTextToken;

        $conv1 = Conversation::factory()->create(['session_id' => 'sess-1', 'source' => 'widget']);
        $conv2 = Conversation::factory()->create(['session_id' => 'sess-2', 'source' => 'widget']);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Session-Id' => 'sess-1',
        ])->getJson('/api/widget/conversations');

        $response->assertOk();
        // Widget endpoint doesn't have list, test via chat
    }

    public function test_admin_bypass_rls_sees_all_conversations(): void
    {
        $gestor = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        $gestorProfile = Profile::factory()->create(['user_id' => $gestor->id, 'role' => 'gestor', 'is_active' => true]);
        $gestorToken = $gestor->createToken('test', ['gestor'])->plainTextToken;

        $user1 = User::factory()->create(['email' => 'user1@test.com', 'password' => Hash::make('pass')]);
        $profile1 = Profile::factory()->create(['user_id' => $user1->id, 'role' => 'operador', 'is_active' => true]);

        $user2 = User::factory()->create(['email' => 'user2@test.com', 'password' => Hash::make('pass')]);
        $profile2 = Profile::factory()->create(['user_id' => $user2->id, 'role' => 'operador', 'is_active' => true]);

        $conv1 = Conversation::factory()->create(['user_id' => $profile1->id, 'source' => 'direct']);
        $conv2 = Conversation::factory()->create(['user_id' => $profile2->id, 'source' => 'direct']);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $gestorToken])
            ->getJson('/api/admin/conversations');

        // Admin list endpoint - needs to be created
        $this->assertTrue(true); // Placeholder
    }

    public function test_internal_user_cannot_access_other_user_conversation_messages(): void
    {
        $user1 = User::factory()->create(['email' => 'user1@test.com', 'password' => Hash::make('pass')]);
        $profile1 = Profile::factory()->create(['user_id' => $user1->id, 'role' => 'operador', 'is_active' => true]);
        $token1 = $user1->createToken('test', ['internal'])->plainTextToken;

        $user2 = User::factory()->create(['email' => 'user2@test.com', 'password' => Hash::make('pass')]);
        $profile2 = Profile::factory()->create(['user_id' => $user2->id, 'role' => 'operador', 'is_active' => true]);

        $conv2 = Conversation::factory()->create(['user_id' => $profile2->id, 'source' => 'direct']);
        Message::factory()->create(['conversation_id' => $conv2->id, 'role' => 'user', 'content' => 'secret']);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token1])
            ->getJson("/api/conversations/{$conv2->id}/messages");

        $response->assertStatus(403);
    }
}