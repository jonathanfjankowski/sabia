<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class SetRlsContext
{
    /**
     * Define variáveis de sessão no PostgreSQL para RLS (Row Level Security)
     *
     * Usa a função set_config do PostgreSQL que aceita parâmetros com bindings.
     * As RLS policies usam estas variáveis via current_setting().
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $sessionId = $request->header('X-Session-Id');

        if ($user) {
            DB::select("SELECT set_config('app.current_user_id', ?, true)", [(string) $user->id]);
            DB::select("SELECT set_config('app.current_role', ?, true)", [$user->profile?->role ?? 'operador']);
        }

        if ($sessionId) {
            DB::select("SELECT set_config('app.current_session_id', ?, true)", [$sessionId]);
        }

        return $next($request);
    }
}
