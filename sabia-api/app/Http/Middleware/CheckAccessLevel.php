<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAccessLevel
{
    public function handle(Request $request, Closure $next, string $required = 'internal'): Response
    {
        $user = $request->user();

        // Widget tokens are always public scope
        if ($user?->tokenCan('widget')) {
            if ($required === 'internal') {
                return response()->json(['message' => 'Acesso interno requerido.'], 403);
            }
        }

        return $next($request);
    }
}
