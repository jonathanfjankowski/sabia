<?php

namespace App\Http\Middleware;

use App\Models\AiProvider;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAiProvider
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $provider = null): Response
    {
        if ($provider) {
            $aiProvider = AiProvider::where('name', $provider)->first();

            if (!$aiProvider) {
                return response()->json([
                    'message' => "AI provider '{$provider}' not found.",
                ], 404);
            }

            if (!$aiProvider->is_active) {
                return response()->json([
                    'message' => "AI provider '{$provider}' is currently inactive.",
                ], 503);
            }

            $request->merge(['ai_provider' => $aiProvider]);
        }

        return $next($request);
    }
}
