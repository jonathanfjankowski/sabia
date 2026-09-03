<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\ArticleChunk;
use App\Models\ArticleVersion;
use App\Models\Profile;
use App\Models\User;
use App\Services\ArticleChunkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RagTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate', ['--seed' => true]);

        // embedding_provider default é 'sidecar': o batch (/embed/batch)
        // dispara antes de qualquer embed per-chunk. Sem fake, o teste
        // tentaria HTTP real contra http://localhost:8000. O batch responde
        // N vetores conforme o request (count mismatch ativaria o fallback).
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

    public function test_article_save_creates_chunks(): void
    {
        $user = User::factory()->create(['email' => 'gestor@test.com', 'password' => Hash::make('pass')]);
        $profile = Profile::factory()->create(['user_id' => $user->id, 'role' => 'gestor', 'is_active' => true]);
        $token = $user->createToken('test', ['gestor'])->plainTextToken;

        // Parágrafos com mais de chunk_size (500) cada — o chunker junta
        // parágrafos curtos, então cada um precisa exceder o limite para
        // virar 1 chunk próprio.
        $longParagraph = fn (string $marker) => $marker.' '.str_repeat('conteúdo longo ', 40);

        $response = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->postJson('/api/admin/articles', [
                'title' => 'Test Article',
                'content' => $longParagraph('Parágrafo um.')."\n\n".$longParagraph('Parágrafo dois.'),
                'access_level' => 'public',
                'status' => 'active',
            ]);

        $response->assertCreated();
        $articleId = $response->json('id');

        // Chunks criados com embedding preenchido (batch do sidecar).
        $chunks = ArticleChunk::where('article_id', $articleId)->get();
        $this->assertGreaterThan(0, $chunks->count());
        // Cast Pgvector\Vector devolve objeto; toArray() expõe as 1024 dims.
        $this->assertCount(1024, $chunks[0]->embedding->toArray());
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
        // Factory não roda chunking (só o controller chama o service).
        app(ArticleChunkService::class)->process($article);

        $originalChunkCount = ArticleChunk::where('article_id', $article->id)->count();
        $originalChunkIds = ArticleChunk::where('article_id', $article->id)->pluck('id')->all();
        $this->assertGreaterThan(0, $originalChunkCount);

        // 3 parágrafos longos → 3 chunks (mesma lógica do teste de save).
        $longParagraph = fn (string $marker) => $marker.' '.str_repeat('novo conteúdo ', 40);
        $response = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->putJson("/api/admin/articles/{$article->id}", [
                'content' => $longParagraph('Um.')."\n\n".$longParagraph('Dois.')."\n\n".$longParagraph('Três.'),
            ]);

        $response->assertOk();

        // Chunks recriados com o novo conteúdo (count > 0 e ids novos).
        $newChunks = ArticleChunk::where('article_id', $article->id)->get();
        $this->assertGreaterThan(0, $newChunks->count());
        $this->assertNotEquals(
            $originalChunkIds,
            $newChunks->pluck('id')->all()
        );
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
        ArticleVersion::create([
            'article_id' => $article->id,
            'version' => 1,
            'content' => 'Version 1 content.',
            'edited_by' => $profile->id,
        ]);

        $response = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->postJson("/api/admin/articles/{$article->id}/revert/1");

        $response->assertOk();

        // Verify chunks recreated with reverted content
        $chunks = ArticleChunk::where('article_id', $article->id)->get();
        $this->assertGreaterThan(0, $chunks->count());
    }
}
