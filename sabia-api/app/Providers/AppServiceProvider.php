<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Rate limiters (spec §9.9)
        $this->registerRateLimiters();
    }

    private function registerRateLimiters(): void
    {
        // Login: 5 tentativas / 15 min por IP E por conta — só por IP não
        // impede password spraying distribuído
        RateLimiter::for('login', function (Request $request) {
            $email = strtolower((string) $request->input('email'));
            $tooMany = fn () => response()->json(
                ['message' => 'Muitas tentativas. Tente novamente em 15 minutos.'],
                429
            );

            return [
                Limit::perMinutes(15, 5)->by('login:ip:'.$request->ip())->response($tooMany),
                Limit::perMinutes(15, 5)->by('login:email:'.$email)->response($tooMany),
            ];
        });

        // Chat interno: 100 req/min por user autenticado
        RateLimiter::for('chat', function (Request $request) {
            return Limit::perMinute(100)->by(
                $request->user()?->id ?? $request->ip()
            )->response(function () {
                return response()->json(['message' => 'Limite de requisições excedido.'], 429);
            });
        });

        // Chat widget público: 30 req/min por IP
        RateLimiter::for('widget-chat', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip())->response(function () {
                return response()->json(['message' => 'Limite de requisições excedido.'], 429);
            });
        });

        // Upload de imagens: 20 req/min por user
        RateLimiter::for('upload', function (Request $request) {
            return Limit::perMinute(20)->by(
                $request->user()?->id ?? $request->ip()
            )->response(function () {
                return response()->json(['message' => 'Limite de uploads excedido.'], 429);
            });
        });

        // API geral: 200 req/min por user/IP
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(200)->by(
                $request->user()?->id ?? $request->ip()
            );
        });
    }
}
