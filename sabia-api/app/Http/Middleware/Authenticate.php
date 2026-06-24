<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class Authenticate
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     *
     * @throws AuthenticationException
     */
    public function handle(Request $request, Closure $next, string ...$guards): Response
    {
        $guard = config('auth.defaults.guard', 'web');
        
        if (!empty($guards)) {
            $guard = $guards[0];
        }

        $user = auth()->guard($guard)->user();

        if (!$user) {
            throw new AuthenticationException('Unauthenticated.', [$guard]);
        }

        return $next($request);
    }
}
