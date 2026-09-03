<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_token_and_user(): void
    {
        $user = User::factory()->create([
            'email' => 'gestor@sabia.local',
            'password' => Hash::make('password123'),
        ]);

        Profile::factory()->create([
            'user_id' => $user->id,
            'role' => 'gestor',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'gestor@sabia.local',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'user' => ['id', 'email', 'profile' => ['id', 'full_name', 'role', 'is_active']],
                'token',
            ]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create([
            'email' => 'gestor@sabia.local',
            'password' => Hash::make('password123'),
        ]);

        Profile::factory()->create([
            'user_id' => $user->id,
            'role' => 'gestor',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'gestor@sabia.local',
            'password' => 'wrong',
        ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'Credenciais inválidas.']);
    }

    public function test_login_fails_for_inactive_user(): void
    {
        $user = User::factory()->create([
            'email' => 'gestor@sabia.local',
            'password' => Hash::make('password123'),
        ]);

        Profile::factory()->create([
            'user_id' => $user->id,
            'role' => 'gestor',
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'gestor@sabia.local',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            // Mensagem unificada: não revelar que a conta existe mas está inativa
            ->assertJson(['message' => 'Credenciais inválidas.']);
    }

    public function test_login_throttle_blocks_after_5_attempts(): void
    {
        $user = User::factory()->create([
            'email' => 'gestor@sabia.local',
            'password' => Hash::make('password123'),
        ]);

        Profile::factory()->create([
            'user_id' => $user->id,
            'role' => 'gestor',
            'is_active' => true,
        ]);

        // 5 failed attempts
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'gestor@sabia.local',
                'password' => 'wrong',
            ]);
        }

        // 6th attempt should be throttled
        $response = $this->postJson('/api/auth/login', [
            'email' => 'gestor@sabia.local',
            'password' => 'wrong',
        ]);

        $response->assertStatus(429)
            ->assertJson(['message' => 'Muitas tentativas. Tente novamente em 15 minutos.']);
    }

    public function test_logout_deletes_token(): void
    {
        $user = User::factory()->create([
            'email' => 'gestor@sabia.local',
            'password' => Hash::make('password123'),
        ]);

        $profile = Profile::factory()->create([
            'user_id' => $user->id,
            'role' => 'gestor',
            'is_active' => true,
        ]);

        $token = $user->createToken('test', ['gestor'])->plainTextToken;

        $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJson(['message' => 'Logout realizado']);

        // No mesmo processo de teste o guard Sanctum memoiza o usuário da
        // request anterior; sem forgetGuards o /me nem consultaria o banco
        $this->app->make('auth')->forgetGuards();

        // Token should be invalidated
        $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->getJson('/api/auth/me')
            ->assertStatus(401);
    }

    public function test_me_returns_current_user(): void
    {
        $user = User::factory()->create([
            'email' => 'gestor@sabia.local',
            'password' => Hash::make('password123'),
        ]);

        $profile = Profile::factory()->create([
            'user_id' => $user->id,
            'role' => 'gestor',
            'is_active' => true,
        ]);

        $token = $user->createToken('test', ['gestor'])->plainTextToken;

        $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonStructure([
                'user' => ['id', 'email', 'profile' => ['id', 'full_name', 'role', 'is_active']],
            ]);
    }
}
