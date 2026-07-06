<?php

namespace App\Http\Middleware;

use App\Models\WidgetSetting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class CheckWidgetOrigin
{
    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->header('Origin');
        $referer = $request->header('Referer');

        $domain = null;
        if ($origin) {
            $domain = parse_url($origin, PHP_URL_HOST);
        } elseif ($referer) {
            $domain = parse_url($referer, PHP_URL_HOST);
        }

        if (!$domain) {
            return response()->json(['error' => 'Origem não identificada.'], 403);
        }

        $settings = WidgetSetting::getActive();

        if (!$settings->isDomainAllowed($domain)) {
            Log::warning('Widget origin not allowed', [
                'domain' => $domain,
                'origin' => $origin,
                'referer' => $referer,
            ]);
            return response()->json(['error' => 'Origem não autorizada.'], 403);
        }

        return $next($request);
    }
}
