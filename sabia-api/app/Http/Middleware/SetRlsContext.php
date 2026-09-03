<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class SetRlsContext
{
    public function handle(Request $request, Closure $next, string $defaultRole = 'internal'): Response
    {
        $user = $request->user();

        $profileId = $user?->profile?->id ?? $user?->id;
        if ($profileId) {
            // false = escopo de SESSÃO da conexão (SET LOCAL morreria com a
            // transação antes do corpo streamado do SSE rodar)
            DB::statement("SELECT set_config('app.current_user_id', ?, false)", [(string) $profileId]);
        }

        $sessionId = $request->input('session_id') ?? $request->headers->get('X-Session-Id');
        if ($sessionId) {
            DB::statement("SELECT set_config('app.current_session_id', ?, false)", [(string) $sessionId]);
        }

        if ($defaultRole === 'widget' || $user?->tokenCan('widget')) {
            DB::statement('SET ROLE sabia_widget');
        } elseif ($user?->profile?->isGestor()) {
            DB::statement('SET ROLE sabia_bypass');
        } else {
            DB::statement('SET ROLE sabia_internal');
        }

        return $next($request);
    }

    /**
     * Sem a transação envolvente, o papel/contexto vive na sessão da conexão:
     * restauramos para não vazar contexto elevado para outra request caso a
     * conexão seja reaproveitada (persistent connections / octane).
     */
    public function terminate(Request $request, Response $response): void
    {
        try {
            DB::statement('RESET ROLE');
            DB::statement("SELECT set_config('app.current_user_id', '', false), set_config('app.current_session_id', '', false)");
        } catch (Throwable) {
            // conexão já encerrada — nada a restaurar
        }
    }
}
