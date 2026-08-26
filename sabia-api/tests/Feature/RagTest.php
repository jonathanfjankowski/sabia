<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\ArticleChunk;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RagTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate', ['--seed' => true]);
    }

    public function test_article_save_creates_chunks(): void
    {
        $user = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        $profile = Profile::factory()->create(['user_id' => $user->id, 'role' => 'gestor', 'is_active' => true]);
        $token = $user->createToken('test', ['gestor'])->plainTextToken;

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->postJson('/api/admin/articles', [
                'title' => 'Test Article',
                'content' => 'Paragraph 1 content.' . "\n\n" . 'Paragraph 2 with more content.',
                'access_level' => 'public',
                'status' => 'active',
            ]);

        $response->assertCreated();
        $articleId = $response->json('id');

        // Verify chunks were created
        $this->assertDatabaseCount('article_chunks', 2); // 2 paragraphs
        $chunks = \App\Models\ArticleChunk::where('article_id', $articleId)->get();
        $this->assertCount(2, $chunks);
        $this->assertNotEmpty($chunks[0]->embedding);
    }

    public function test_article_update_recreates_chunks(): void
    {
        $user = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        $profile = Profile::factory()->create(['user_id' => $user->id, 'role' => 'gestor', 'is_active' => true]);
        $token = $user->createToken('test', ['gestor'])->plainTextToken;

        $article = Article::factory()->create([
            'created_by' => $profile->id,
            'access_level' => 'internal',
            'status' => 'active',
        ]);

        $originalChunkCount = \App\Models\ArticleChunk::where('article_id', $article->id)->count();
        $this->assertGreaterThan(0, $originalChunkCount);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->putJson("/api/admin/articles/{$article->id}", [
                'content' => 'New content paragraph 1.' . "\n\n" . 'New content paragraph 2.' . "\n\n" . 'New content paragraph 3.',
            ]);

        $response->assertOk();

        $newChunkCount = \App\Models\ArticleChunk::where('article_id', $article->id)->count();
        $this->assertEquals(3, $newChunkCount);
    }

    public function test_article_revert_recreates_chunks(): void
    {
        $user = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        $profile = Profile::factory()->create(['user_id' => $user->id, 'role' => 'gestor', 'is_active' => true]);
        $token = $user->createToken('test', ['gestor'])->plainTextToken;

        $article = Article::factory()->create([
            'created_by' => $profile->id,
            'access_level' => 'internal',
            'status' => 'active',
            'version' => 1,
            'content' => 'Version 1 content.',
        ]);

        // Update to version 2
        $article->update(['content' => 'Version 2 content.', 'version' => 2]);
        \App\Models\ArticleVersion::create([
            'article_id' => $article->id,
            'version' => 1,
            'content' => 'Version 1 content.',
            'edited_by' => $profile->id,
        ]);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->postJson("/api/admin/articles/{$article->id}/revert/1");

        $response->assertOk();

        // Verify chunks recreated with reverted content
        $chunks = \App\Models\ArticleChunk::where('article_id', $article->id)->get();
        $this->assertGreaterThan(0, $chunks->count());
    }
}