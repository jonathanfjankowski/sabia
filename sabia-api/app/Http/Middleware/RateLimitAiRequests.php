<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;

class RateLimitAiRequests
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $limiterName = $user ? 'ai-requests-user-' . $user->id : 'ai-requests-ip-' . $request->ip();
        
        if (RateLimiter::tooManyAttempts($limiterName, 10)) {
            return response()->json([
                'message' => 'Too many AI requests. Please try again later.',
            ], 429);
        }
        
        RateLimiter::hit($limiterName, 60); // 10 requests per minute
        
        return $next($request);
    }
}
