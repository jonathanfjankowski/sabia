<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAiProviderConfigured
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if the conversation has an AI provider configured
        $conversation = $request->route('conversation');
        
        if ($conversation && !$conversation->ai_provider_id) {
            return response()->json([
                'message' => 'No AI provider configured for this conversation',
            ], 400);
        }
        
        // Check if the selected provider has an API key configured
        if ($conversation && $conversation->aiProvider) {
            $provider = $conversation->aiProvider;
            
            // Check if the provider has a valid API key
            if (empty($provider->api_key)) {
                return response()->json([
                    'message' => 'AI provider API key not configured',
                ], 400);
            }
        }
        
        return $next($request);
    }
}
