<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        $profile = $user?->profile;

        if (! $profile || ! $profile->is_active) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if (! in_array($profile->role, $roles, true)) {
            return response()->json(['message' => 'Permissão insuficiente.'], 403);
        }

        return $next($request);
    }
}
