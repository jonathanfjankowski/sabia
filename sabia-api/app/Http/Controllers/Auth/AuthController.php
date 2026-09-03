<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\User;
use App\Services\SystemLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private SystemLogService $logger = new SystemLogService,
    ) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|string|email|max:255',
            'password' => 'required|string|min:1|max:255',
        ]);

        $email = strtolower($request->input('email'));
        $user = User::where('email', $email)->first();

        // Hash dummy quando o e-mail não existe: mantém o tempo de resposta
        // estável e não revela quais contas existem (enumeração por timing)
        $validPassword = Hash::check(
            $request->input('password'),
            $user?->password ?? '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
        );

        if (! $user || ! $validPassword) {
            $this->logger->log('warning', 'login_failed', 'Tentativa de login falhou', [
                'email' => $email,
                'ip' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
            ]);
            throw ValidationException::withMessages([
                'email' => ['Credenciais inválidas.'],
            ]);
        }

        $profile = Profile::where('user_id', $user->id)->first();
        if (! $profile || ! $profile->is_active) {
            $this->logger->log('warning', 'login_inactive', 'Login bloqueado — usuário inativo', [
                'email' => $email,
                'ip' => $request->ip(),
            ]);
            // Mesma mensagem de credenciais inválidas: confirmar que a conta
            // existe (mas está desativada) ajudaria um atacante
            throw ValidationException::withMessages([
                'email' => ['Credenciais inválidas.'],
            ]);
        }

        $abilities = $profile->isGestor()
            ? ['gestor']
            : ($profile->isOperador() ? ['operador'] : ['internal']);

        $this->logger->log('info', 'login_success', 'Login realizado', [
            'user_id' => $user->id,
            'role' => $profile->role,
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'profile' => [
                    'id' => $profile->id,
                    'full_name' => $profile->full_name,
                    'role' => $profile->role,
                    'is_active' => $profile->is_active,
                ],
            ],
            'token' => $user->createToken('sabia_token', $abilities)->plainTextToken,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        $this->logger->log('info', 'logout', 'Logout realizado', [
            'user_id' => $request->user()->id,
        ]);

        return response()->json(['message' => 'Logout realizado']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = Profile::where('user_id', $user->id)->first();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'profile' => $profile ? [
                    'id' => $profile->id,
                    'full_name' => $profile->full_name,
                    'role' => $profile->role,
                    'is_active' => $profile->is_active,
                ] : null,
            ],
        ]);
    }
}
