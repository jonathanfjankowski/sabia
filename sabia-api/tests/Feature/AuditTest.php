<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate', ['--seed' => true]);
    }

    public function test_audit_log_created_on_article_create(): void
    {
        $user = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        $profile = Profile::factory()->create(['user_id' => $user->id, 'role' => 'gestor', 'is_active' => true]);
        $token = $user->createToken('test', ['gestor'])->plainTextToken;

        $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->postJson('/api/admin/articles', [
                'title' => 'Test Article',
                'content' => 'Content',
                'access_level' => 'public',
                'status' => 'active',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'article.create',
            'entity_type' => 'article',
        ]);
    }

    public function test_audit_log_created_on_article_update(): void
    {
        $user = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        $profile = Profile::factory()->create(['user_id' => $user->id, 'role' => 'gestor', 'is_active' => true]);
        $token = $user->createToken('test', ['gestor'])->plainTextToken;

        $article = Article::factory()->create(['created_by' => $profile->id]);

        $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->putJson("/api/admin/articles/{$article->id}", [
                'title' => 'Updated Title',
            ])
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'article.update',
            'entity_type' => 'article',
            'entity_id' => (string) $article->id,
        ]);
    }

    public function test_audit_log_created_on_settings_ai_change(): void
    {
        $user = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        $profile = Profile::factory()->create(['user_id' => $user->id, 'role' => 'gestor', 'is_active' => true]);
        $token = $user->createToken('test', ['gestor'])->plainTextToken;

        $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->putJson('/api/admin/settings/ai', [
                'provider' => 'openai',
                'model' => 'gpt-4o',
                'endpoint' => 'https://api.openai.com/v1',
                'api_key' => 'sk-test',
                'temperature' => 0.5,
                'max_tokens' => 2000,
            ])
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'settings.ai.change',
            'entity_type' => 'ai_settings',
        ]);
    }

    public function test_audit_log_created_on_settings_widget_change(): void
    {
        $user = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        $profile = Profile::factory()->create(['user_id' => $user->id, 'role' => 'gestor', 'is_active' => true]);
        $token = $user->createToken('test', ['gestor'])->plainTextToken;

        $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->putJson('/api/admin/settings/widget', [
                'welcome_message' => 'Welcome!',
                'support_start_time' => '08:00',
                'support_end_time' => '18:00',
            ])
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'settings.widget.change',
            'entity_type' => 'widget_settings',
        ]);
    }

    public function test_audit_log_created_on_user_deactivate(): void
    {
        $gestor = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        $gestorProfile = Profile::factory()->create(['user_id' => $gestor->id, 'role' => 'gestor', 'is_active' => true]);
        $gestorToken = $gestor->createToken('test', ['gestor'])->plainTextToken;

        $user = User::factory()->create(['email' => 'target@test.com', 'password' => Hash::make('pass')]);
        $profile = Profile::factory()->create(['user_id' => $user->id, 'role' => 'operador', 'is_active' => true]);

        $this->withHeaders(['Authorization' => 'Bearer ' . $gestorToken])
            ->deleteJson("/api/admin/users/{$profile->id}")
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.deactivate',
            'entity_type' => 'profile',
            'entity_id' => (string) $profile->id,
        ]);
    }
}