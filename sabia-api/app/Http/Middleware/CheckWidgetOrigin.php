<?php

namespace App\Http\Middleware;

use App\Models\WidgetSettings;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckWidgetOrigin
{
    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->header('Origin') ?? $request->header('Referer');
        $host = $origin ? parse_url($origin, PHP_URL_HOST) : null;

        $allowedDomains = WidgetSettings::current()->allowed_domains ?? [];

        if (empty($allowedDomains)) {
            return $next($request);
        }

        if (!$host) {
            return $this->forbidden($origin);
        }

        foreach ($allowedDomains as $domain) {
            $domain = ltrim($domain, '.');
            if ($host === $domain || str_ends_with($host, '.' . $domain)) {
                return $next($request);
            }
        }

        return $this->forbidden($origin);
    }

    private function forbidden(?string $origin): Response
    {
        return response()->json([
            'error' => 'Origem não autorizada.',
            'origin' => $origin,
        ], 403);
    }
}
