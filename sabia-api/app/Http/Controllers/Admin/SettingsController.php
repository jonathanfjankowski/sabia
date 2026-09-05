<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiSettings;
use App\Models\BrandSettings;
use App\Models\WidgetSettings;
use App\Services\AIProvider;
use App\Services\AuditService;
use App\Services\EmbeddingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SettingsController extends Controller
{
    private const SECRET_MASK = '••••••••';

    private const SECRET_FIELDS = ['api_key', 'embedding_api_key', 'teams_webhook_url'];

    // AI settings
    public function ai(Request $request): JsonResponse
    {
        $settings = AiSettings::current();

        // Never expose the encrypted API key — return masked version
        $data = $settings->toArray();
        $data['api_key'] = $settings->api_key ? self::SECRET_MASK : '';
        $data['embedding_api_key'] = $settings->embedding_api_key ? self::SECRET_MASK : '';
        $data['embedding_sidecar_connected'] = app(EmbeddingService::class)->isAvailable();
        $data['embedding_sidecar_url'] = config('services.embedding.url');

        return response()->json($data);
    }

    public function aiUpdate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => 'nullable|url',
            'api_key' => 'nullable|string',
            'model' => 'required|string|max:100',
            'embedding_provider' => 'in:sidecar,openai,gemini,custom',
            'embedding_model' => 'nullable|string|max:100',
            'embedding_endpoint' => 'nullable|url',
            'embedding_api_key' => 'nullable|string',
            'temperature' => 'numeric|between:0,1',
            'max_tokens' => 'nullable|integer|min:1|max:1000000',
            'stream_timeout_seconds' => 'integer|min:10|max:600',
            'system_prompt' => 'nullable|string',
            'chunk_size' => 'integer|min:100|max:4000',
            'chunk_overlap' => 'integer|min:0|max:1000',
            'rag_top_n' => 'integer|min:1|max:20',
            'confidence_threshold' => 'numeric|between:0,1',
            'language' => 'in:pt-BR,en-US,es',
        ]);

        // A chave só é atualizada quando o gestor digita uma nova; a máscara
        // devolvida pelo GET (ou string vazia) nunca pode sobrescrever a real.
        foreach (['api_key', 'embedding_api_key'] as $key) {
            if (($data[$key] ?? null) === self::SECRET_MASK) {
                unset($data[$key]);
            } elseif (array_key_exists($key, $data) && $data[$key] === '') {
                $data[$key] = null;
            }
        }

        $settings = AiSettings::current();
        $old = $this->redactSecrets($settings->toArray());

        $settings->fill($data);
        $settings->updated_by = $request->user()->profile?->id;
        $settings->save();
        AiSettings::clearCache();

        AuditService::record('settings.ai.change', 'AiSettings', (string) $settings->id, $old, $this->redactSecrets($settings->toArray()));

        $data['api_key'] = $settings->api_key ? self::SECRET_MASK : '';
        $data['embedding_api_key'] = $settings->embedding_api_key ? self::SECRET_MASK : '';

        return response()->json($data);
    }

    public function testPrompt(Request $request): StreamedResponse
    {
        $data = $request->validate([
            'system_prompt' => 'required|string',
            'test_message' => 'required|string',
        ]);

        $settings = AiSettings::current();
        $settings->system_prompt = $data['system_prompt'];

        $provider = new AIProvider($settings);

        return response()->stream(function () use ($provider, $data) {
            foreach ($provider->chat($data['test_message'], $data['system_prompt']) as $chunk) {
                echo 'data: '.json_encode(['text' => $chunk])."\n\n";
                if (ob_get_level() > 0) {
                    @ob_flush();
                }
                flush();
            }
            echo "data: [DONE]\n\n";
            if (ob_get_level() > 0) {
                @ob_flush();
            }
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    // Testa conexão com o sidecar de embeddings (ver docs/arquitetura.md).
    public function testEmbed(): JsonResponse
    {
        $t0 = microtime(true);
        $vector = app(EmbeddingService::class)->embed('health check');
        $latency = (int) ((microtime(true) - $t0) * 1000);

        return response()->json([
            'ok' => ! empty($vector),
            'dimensions' => count($vector),
            'latency_ms' => $latency,
            'url' => config('services.embedding.url'),
        ]);
    }

    public function sidecarHealth(): JsonResponse
    {
        $svc = app(EmbeddingService::class);

        return response()->json([
            'ok' => $svc->isAvailable(),
            'url' => config('services.embedding.url'),
        ]);
    }

    // Widget settings
    public function widget(Request $request): JsonResponse
    {
        $settings = WidgetSettings::current();

        return response()->json($settings);
    }

    public function widgetUpdate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'welcome_message' => 'nullable|string',
            'support_link' => 'nullable|string|max:500',
            'support_start_time' => 'nullable|date_format:H:i',
            'support_end_time' => 'nullable|date_format:H:i',
            'support_phone' => 'nullable|string|max:50',
            'teams_webhook_url' => 'nullable|url',
            'out_of_hours_message' => 'nullable|string',
            'teams_notify_transfer' => 'boolean',
            'teams_notify_gap' => 'boolean',
            'teams_notify_out_of_hours' => 'boolean',
            'allowed_domains' => 'nullable|array',
            'maintenance_mode' => 'boolean',
            'maintenance_message' => 'nullable|string',
        ]);

        $settings = WidgetSettings::current();
        $old = $this->redactSecrets($settings->toArray());

        $settings->fill($data);
        $settings->updated_by = $request->user()->profile?->id;
        $settings->save();
        WidgetSettings::clearCache();

        AuditService::record('settings.widget.change', 'WidgetSettings', (string) $settings->id, $old, $this->redactSecrets($settings->toArray()));

        return response()->json($settings);
    }

    // Brand settings
    public function brand(Request $request): JsonResponse
    {
        $settings = BrandSettings::current();

        return response()->json($settings);
    }

    public function brandUpdate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'app_name' => 'sometimes|string|max:100',
            'logo_url' => 'nullable|string|max:500',
            'favicon_url' => 'nullable|string|max:500',
            'primary_color' => 'nullable|string|max:7',
            'secondary_color' => 'nullable|string|max:7',
            'font' => 'in:Inter,Roboto,Open Sans',
        ]);

        $settings = BrandSettings::current();
        $old = $this->redactSecrets($settings->toArray());

        $settings->fill($data);
        $settings->updated_by = $request->user()->profile?->id;
        $settings->save();
        BrandSettings::clearCache();

        AuditService::record('settings.brand.change', 'BrandSettings', (string) $settings->id, $old, $this->redactSecrets($settings->toArray()));

        return response()->json($settings);
    }

    /**
     * Substitui segredos (chaves de API, webhooks) antes de gravar/consultar
     * o audit log — audit_logs é legível pela UI de gestão.
     */
    private function redactSecrets(array $data): array
    {
        foreach (self::SECRET_FIELDS as $field) {
            if (! empty($data[$field])) {
                $data[$field] = self::SECRET_MASK;
            }
        }

        return $data;
    }
}
