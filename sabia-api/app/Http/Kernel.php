<?php

namespace App\Http;

use App\Http\Middleware\CheckAccessLevel;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\CheckWidgetOrigin;
use App\Http\Middleware\RedirectIfAuthenticated;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetRlsContext;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Auth\Middleware\AuthenticateWithBasicAuth;
use Illuminate\Auth\Middleware\Authorize;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Foundation\Http\Kernel as HttpKernel;
use Illuminate\Http\Middleware\SetCacheHeaders;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Routing\Middleware\ValidateSignature;
use Illuminate\Session\Middleware\AuthenticateSession;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

class Kernel extends HttpKernel
{
    protected $middleware = [
        // SecurityHeaders já registrado via bootstrap/app.php
    ];

    protected $middlewareGroups = [
        'web' => [
            SubstituteBindings::class,
            SecurityHeaders::class,
        ],

        'api' => [
            SubstituteBindings::class,
            ThrottleRequests::class.':api',
            ValidateSignature::class,
            SecurityHeaders::class,
        ],
    ];

    protected $routeMiddleware = [
        'auth' => Authenticate::class,
        'auth.basic' => AuthenticateWithBasicAuth::class,
        'auth.session' => AuthenticateSession::class,
        'cache.headers' => SetCacheHeaders::class,
        'can' => Authorize::class,
        'guest' => RedirectIfAuthenticated::class, // not used but referenced by auth scaffold
        'password.confirm' => RequirePassword::class,
        'signed' => ValidateSignature::class,
        'throttle' => ThrottleRequests::class,
        'verified' => EnsureEmailIsVerified::class,

        // Custom
        'role' => CheckRole::class,
        'access' => CheckAccessLevel::class,
        'rls' => SetRlsContext::class,
        'widget.origin' => CheckWidgetOrigin::class,
        'sanctum' => EnsureFrontendRequestsAreStateful::class,
    ];
}
