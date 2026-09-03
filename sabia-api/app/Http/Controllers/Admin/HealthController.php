<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiSettings;
use App\Models\SystemLog;
use App\Services\AIProvider;
use App\Services\EmbeddingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HealthController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $settings = AiSettings::current();
        $provider = new AIProvider($settings);

        // Quick connectivity test. Com embedding_provider=sidecar, o embed
        // real já passa pelo sidecar (com fallback interno) — ping direto
        // do /health evita gerar embedding só pra checar conexão.
        if (($settings->embedding_provider ?? null) === 'sidecar') {
            $aiConnected = app(EmbeddingService::class)->isAvailable();
        } else {
            // embed() não lança em falha de rede (retorna []) — o teste é
            // sobre o vetor, não sobre exceção.
            $aiConnected = ! empty($provider->embed('health_check'));
        }

        $recentErrors = SystemLog::whereIn('level', ['error', 'critical'])
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'ai_provider' => $settings->model.' @ '.parse_url($settings->endpoint ?? '', PHP_URL_HOST),
            'ai_connected' => $aiConnected,
            'maintenance_mode' => false, // TODO: from widget_settings
            'recent_critical_errors' => $recentErrors,
        ]);
    }
}
