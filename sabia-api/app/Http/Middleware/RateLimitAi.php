<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RateLimitAi
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, int $maxAttempts = 60, int $decayMinutes = 1): Response
    {
        $userId = Auth::id() ?? $request->ip();
        $key = 'ai-rate-limit:' . $userId;

        $rateLimiter = app(RateLimiter::class);

        if ($rateLimiter->tooManyAttempts($key, $maxAttempts)) {
            $retryAfter = $rateLimiter->availableIn($key);
            
            return response()->json([
                'message' => 'Too many AI requests. Please try again later.',
                'retry_after' => $retryAfter,
            ], 429);
        }

        $rateLimiter->hit($key, $decayMinutes * 60);

        return $next($request);
    }
}
