<?php

namespace Database\Seeders;

use App\Models\AiProvider;
use Illuminate\Database\Seeder;

class AiProviderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $providers = [
            [
                'name' => 'OpenAI',
                'api_key' => env('OPENAI_API_KEY'),
                'endpoint' => 'https://api.openai.com/v1',
                'is_active' => false,
                'config' => [
                    'models' => ['gpt-4', 'gpt-3.5-turbo'],
                    'default_model' => 'gpt-3.5-turbo',
                ],
            ],
            [
                'name' => 'Anthropic',
                'api_key' => env('ANTHROPIC_API_KEY'),
                'endpoint' => 'https://api.anthropic.com',
                'is_active' => false,
                'config' => [
                    'models' => ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
                    'default_model' => 'claude-3-haiku-20240307',
                ],
            ],
            [
                'name' => 'Google',
                'api_key' => env('GOOGLE_API_KEY'),
                'endpoint' => 'https://generativelanguage.googleapis.com',
                'is_active' => true,
                'config' => [
                    'models' => ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
                    'default_model' => 'gemini-1.5-flash',
                ],
            ],
        ];

        foreach ($providers as $providerData) {
            AiProvider::updateOrCreate(
                ['name' => $providerData['name']],
                $providerData
            );
        }
    }
}
