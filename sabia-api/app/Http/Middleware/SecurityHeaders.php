<?php

namespace App\Http\Middleware;

use App\Models\WidgetSettings;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (!config('security.enabled', true)) {
            return $response;
        }

        $headers = config('security.headers', []);

        // /widget é embedável via iframe — sobrescreve DENY por SAMEORIGIN
        // e ajusta CSP frame-ancestors para allowed_domains do widget.
        if ($request->is('widget') || $request->is('widget/*')) {
            $headers['X-Frame-Options'] = config('security.widget.X-Frame-Options', 'SAMEORIGIN');

            $allowed = WidgetSettings::current()->allowed_domains ?? [];
            if (!empty($allowed)) {
                $ancestors = implode(' ', array_map(fn ($d) => 'https://' . ltrim($d, '.'), $allowed));
                $headers['Content-Security-Policy'] = preg_replace(
                    "/frame-ancestors [^;]+/",
                    "frame-ancestors 'self' {$ancestors}",
                    $headers['Content-Security-Policy'] ?? ''
                );
            }
        }

        foreach ($headers as $header => $value) {
            $response->headers->set($this->normalize($header), $value);
        }

        return $response;
    }

    private function normalize(string $header): string
    {
        return strtolower(preg_replace('/([a-z])([A-Z])/', '$1-$2', $header));
    }
}
