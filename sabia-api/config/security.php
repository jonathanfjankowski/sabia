<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Security Headers
    |--------------------------------------------------------------------------
    | Aplicados globalmente pelo App\Http\Middleware\SecurityHeaders.
    | Spec §9.2 — HSTS, CSP, X-Frame-Options DENY, nosniff, Referrer-Policy.
    |
    | Valores podem ser sobrescritos via env: SECURITY_HEADER_<NAME>=value
    | (sem normalização; usar exatamente o nome HTTP).
    */

    'enabled' => env('SECURITY_HEADERS_ENABLED', true),

    'headers' => [
        'Strict-Transport-Security' => env('HSTS_HEADER', 'max-age=31536000; includeSubDomains; preload'),
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => env('X_FRAME_OPTIONS', 'DENY'),
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
        'Permissions-Policy' => 'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy' => env(
            'CSP_HEADER',
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https: data:; connect-src 'self'; frame-ancestors 'none'"
        ),
    ],

    /*
    | Rota /widget precisa permitir embed via iframe em domínios autorizados.
    | Sobrescreve X-Frame-Options para SAMEORIGIN e CSP frame-ancestors
    | para lista de WidgetSettings.allowed_domains.
    */
    'widget' => [
        'X-Frame-Options' => 'SAMEORIGIN',
    ],

    /*
    | Payload máximo (10MB por spec §9.8). Nginx/php.ini devem alinhar.
    */
    'max_payload_kb' => 10240,
];
