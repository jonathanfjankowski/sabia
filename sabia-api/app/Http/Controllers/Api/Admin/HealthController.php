<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\SystemLog;
use App\Services\AiServiceFactory;
use Illuminate\Http\Request;

class HealthController extends Controller
{
    public function index()
    {
        $aiSettings = AiSetting::getActive();

        // Status da IA
        $aiStatus = 'not_configured';
        $aiError = null;
        if ($aiSettings->isConfigured()) {
            try {
                $service = AiServiceFactory::default();
                $aiStatus = $service->isValid() ? 'connected' : 'invalid';
                if ($aiStatus === 'invalid') {
                    $aiError = 'API key inválida ou conexão falhou';
                }
            } catch (\Exception $e) {
                $aiStatus = 'error';
                $aiError = $e->getMessage();
            }
        }

        // Requisições nas últimas 24h
        $requests24h = Message::where('created_at', '>=', now()->subDay())->count();

        // Últimos 10 erros críticos
        $criticalErrors = SystemLog::byLevel('critical')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'ai' => [
                'status' => $aiStatus,
                'error' => $aiError,
                'provider' => $aiSettings->provider,
                'model' => $aiSettings->model,
                'configured' => $aiSettings->isConfigured(),
            ],
            'requests_24h' => $requests24h,
            'total_conversations' => Conversation::count(),
            'critical_errors' => $criticalErrors,
            'database' => $this->checkDatabase(),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    protected function checkDatabase(): array
    {
        try {
            \DB::select('SELECT 1');
            return ['status' => 'connected'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }
}
