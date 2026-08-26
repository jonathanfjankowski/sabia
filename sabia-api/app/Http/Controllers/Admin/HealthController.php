<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiSettings;
use App\Models\SystemLog;
use App\Services\AIProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HealthController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $settings = AiSettings::current();
        $provider = new AIProvider(\App\Models\AiSettings::current());

        // Quick connectivity test
        try {
            $provider->embed('health_check');
            $aiConnected = true;
        } catch (\Throwable) {
            $aiConnected = false;
        }

        $recentErrors = SystemLog::whereIn('level', ['error', 'critical'])
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'ai_provider' => $settings->model . ' @ ' . parse_url($settings->endpoint ?? '', PHP_URL_HOST),
            'ai_connected' => $aiConnected,
            'maintenance_mode' => false, // TODO: from widget_settings
            'recent_critical_errors' => $recentErrors,
        ]);
    }
}
