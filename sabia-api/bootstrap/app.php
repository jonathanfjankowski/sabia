<?php

use App\Http\Middleware\CheckAccessLevel;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\CheckWidgetOrigin;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetRlsContext;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
        $middleware->statefulApi();
        $middleware->append(HandleCors::class);

        $middleware->appendToGroup('security', [
            SecurityHeaders::class,
        ]);

        $middleware->alias([
            'role' => CheckRole::class,
            'access' => CheckAccessLevel::class,
            'rls' => SetRlsContext::class,
            'widget.origin' => CheckWidgetOrigin::class,
        ]);

        // Global middleware
        $middleware->append(SecurityHeaders::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
