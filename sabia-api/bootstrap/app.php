<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            'widget.origin' => \App\Http\Middleware\CheckWidgetOrigin::class,
            'rls.context' => \App\Http\Middleware\SetRlsContext::class,
            'security.headers' => \App\Http\Middleware\SecurityHeaders::class,
            'ai.provider' => \App\Http\Middleware\CheckAiProvider::class,
            'ai.configured' => \App\Http\Middleware\EnsureAiProviderConfigured::class,
            'throttle.ai' => \App\Http\Middleware\RateLimitAi::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
