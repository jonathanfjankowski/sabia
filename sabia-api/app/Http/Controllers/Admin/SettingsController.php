<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiSettings;
use App\Models\BrandSettings;
use App\Models\WidgetSettings;
use App\Services\AIProvider;
use App\Services\AuditService;
use App\Services\SystemLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    // AI settings
    public function ai(Request $request): JsonResponse
    {
        $settings = AiSettings::current();

        // Never expose the encrypted API key — return masked version
        $data = $settings->toArray();
        $data['api_key'] = $settings->api_key ? '••••••••' : '';

        return response()->json($data);
    }

    public function aiUpdate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => 'nullable|url',
            'api_key' => 'nullable|string',
            'model' => 'required|string|max:100',
            'embedding_model' => 'nullable|string|max:100',
            'temperature' => 'numeric|between:0,1',
            'max_tokens' => 'integer|min:1|max:32000',
            'system_prompt' => 'nullable|string',
            'chunk_size' => 'integer|min:100|max:4000',
            'chunk_overlap' => 'integer|min:0|max:1000',
            'rag_top_n' => 'integer|min:1|max:20',
            'confidence_threshold' => 'numeric|between:0,1',
            'language' => 'in:pt-BR,en-US,es',
        ]);

        $settings = AiSettings::current();
        $old = $settings->toArray();

        $settings->fill($data);
        $settings->updated_by = $request->user()->profile?->id;
        $settings->save();

        AuditService::record('settings.ai.change', 'AiSettings', (string) $settings->id, $old, $settings->toArray());

        $data['api_key'] = $settings->api_key ? '••••••••' : '';
        return response()->json($data);
    }

    public function testPrompt(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
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
                echo "data: " . json_encode(['text' => $chunk]) . "\n\n";
                ob_flush();
                flush();
            }
            echo "data: [DONE]\n\n";
            ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
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
        $old = $settings->toArray();

        $settings->fill($data);
        $settings->updated_by = $request->user()->profile?->id;
        $settings->save();

        AuditService::record('settings.widget.change', 'WidgetSettings', (string) $settings->id, $old, $settings->toArray());

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
        $old = $settings->toArray();

        $settings->fill($data);
        $settings->updated_by = $request->user()->profile?->id;
        $settings->save();

        AuditService::record('settings.brand.change', 'BrandSettings', (string) $settings->id, $old, $settings->toArray());

        return response()->json($settings);
    }
}
