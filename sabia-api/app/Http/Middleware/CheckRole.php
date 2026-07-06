<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  string  ...$roles  Roles permitidas (gestor, operador)
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Não autenticado.'], 401);
        }

        $profile = $user->profile;

        if (!$profile) {
            return response()->json(['message' => 'Perfil não encontrado.'], 404);
        }

        if (!$profile->is_active) {
            return response()->json(['message' => 'Usuário inativo.'], 403);
        }

        if (!in_array($profile->role, $roles)) {
            return response()->json([
                'message' => 'Acesso não autorizado. Role necessária: ' . implode(' ou ', $roles),
            ], 403);
        }

        return $next($request);
    }
}
