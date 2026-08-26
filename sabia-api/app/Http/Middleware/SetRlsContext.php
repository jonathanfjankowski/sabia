<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class SetRlsContext
{
    public function handle(Request $request, Closure $next, string $defaultRole = 'internal'): Response
    {
        $user = $request->user();

        return DB::transaction(function () use ($request, $next, $user, $defaultRole) {
            
            $profileId = $user?->profile?->id ?? $user?->id;
            if ($profileId) {
                DB::statement("SELECT set_config('app.current_user_id', ?, true)", [(string) $profileId]);
            }

            $sessionId = $request->input('session_id') ?? $request->headers->get('X-Session-Id');
            if ($sessionId) {
                DB::statement("SELECT set_config('app.current_session_id', ?, true)", [(string) $sessionId]);
            }

            if ($defaultRole === 'widget' || $user?->tokenCan('widget')) {
                DB::statement('SET LOCAL ROLE sabia_widget');
            } elseif ($user?->profile?->isGestor()) {
                DB::statement('SET LOCAL ROLE sabia_bypass');
            } else {
                DB::statement('SET LOCAL ROLE sabia_internal');
            }

            return $next($request);
        });
    }
}