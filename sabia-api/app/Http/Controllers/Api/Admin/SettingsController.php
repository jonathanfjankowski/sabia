<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use App\Models\CompanySetting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    // ==================== AI Settings ====================

    public function getAiSettings()
    {
        $settings = AiSetting::getActive();

        // Não expor a API key completa
        if ($settings->api_key) {
            $settings->api_key_mask = substr($settings->api_key, 0, 8) . '...' . substr($settings->api_key, -4);
        }

        return response()->json($settings);
    }

    public function updateAiSettings(Request $request)
    {
        $validated = $request->validate([
            'provider' => 'sometimes|string|in:gemini,openai,anthropic',
            'model' => 'sometimes|string|max:100',
            'api_key' => 'nullable|string',
            'system_prompt' => 'nullable|string',
            'max_tokens' => 'sometimes|integer|min:100|max:32000',
            'temperature' => 'sometimes|numeric|min:0|max:1',
            'top_k' => 'sometimes|integer|min:1|max:50',
            'confidence_threshold' => 'sometimes|numeric|min:0|max:1',
            'enable_rag' => 'sometimes|boolean',
            'enable_citations' => 'sometimes|boolean',
        ]);

        $settings = AiSetting::getActive();
        $settings->update($validated);

        return response()->json($settings);
    }

    // ==================== Company/Brand Settings ====================

    public function getCompanySettings()
    {
        $settings = CompanySetting::getActive();

        return response()->json($settings);
    }

    public function updateCompanySettings(Request $request)
    {
        $validated = $request->validate([
            'company_name' => 'sometimes|string|max:255',
            'logo_url' => 'nullable|string|max:500',
            'primary_color' => 'sometimes|string|max:7',
            'secondary_color' => 'sometimes|string|max:7',
            'welcome_message' => 'nullable|string',
            'contact_info' => 'nullable|array',
            'contact_info.email' => 'nullable|email',
            'contact_info.phone' => 'nullable|string',
            'contact_info.address' => 'nullable|string',
            'enable_evaluations' => 'sometimes|boolean',
            'enable_audit_logs' => 'sometimes|boolean',
        ]);

        $settings = CompanySetting::getActive();
        $settings->update($validated);

        return response()->json($settings);
    }
}
