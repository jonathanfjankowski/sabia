<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class PromptInjectionDetector
{
    /**
     * Padrões conhecidos de prompt injection
     */
    private array $patterns = [
        '/ignore\s+(all\s+)?previous\s+instructions/i',
        '/system\s*:/i',
        '/you\s+are\s+now/i',
        '/act\s+as\s+(a\s+)?(?!support)/i',
        '/forget\s+(everything|your\s+instructions)/i',
        '/new\s+instructions?\s*:/i',
        '/\[INST\]|\[\/INST\]/i',
        '/<\||\|>/i',
        '/<\s*system\s*>/i',
        '/<\s*assistant\s*>/i',
        '/<\s*user\s*>/i',
        '/role\s*:\s*system/i',
        '/you\s+are\s+(not\s+)?(a\s+)?(chatbot|assistant|ai|bot)/i',
        '/repeat\s+(after|the\s+phrase|the\s+text)/i',
        '/output\s+(your\s+)?(prompt|instructions)/i',
        '/disregard\s+(all\s+)?(previous|prior)/i',
        '/pretend\s+(that\s+)?(you|to\s+be)/i',
        '/hidden\s+prompt/i',
        '/jailbreak/i',
        '/dans\s*mode/i',
        '/do\s+(not\s+)?(anything\s+)?(i\s+)?say/i',
        '/override\s+(all\s+)?(instructions|commands|prompts)/i',
    ];

    /**
     * Detecta tentativas de prompt injection
     */
    public function detect(string $input): array
    {
        $matches = [];

        foreach ($this->patterns as $pattern) {
            if (preg_match($pattern, $input, $match)) {
                $matches[] = [
                    'pattern' => $pattern,
                    'match' => $match[0],
                    'position' => mb_strpos($input, $match[0]),
                ];
            }
        }

        return [
            'is_injection' => count($matches) > 0,
            'confidence' => $this->calculateConfidence($matches),
            'matches' => $matches,
            'sanitized_input' => $this->sanitize($input),
        ];
    }

    /**
     * Remove ou neutraliza padrões de injection
     */
    public function sanitize(string $input): string
    {
        $sanitized = $input;

        // Remover tags de sistema
        $sanitized = preg_replace('/<\s*(system|assistant)\s*>.*?<\s*\/\s*(system|assistant)\s*>/is', '', $sanitized);
        $sanitized = preg_replace('/<\s*\|\s*(system|assistant)\s*\|\s*>/i', '', $sanitized);

        // Remover delimitadores de instrução
        $sanitized = preg_replace('/\[INST\].*?\[\/INST\]/is', '', $sanitized);

        return $sanitized;
    }

    /**
     * Calcula nível de confiança da detecção
     */
    private function calculateConfidence(array $matches): string
    {
        $count = count($matches);

        if ($count >= 3) {
            return 'high';
        }
        if ($count >= 2) {
            return 'medium';
        }
        if ($count >= 1) {
            return 'low';
        }

        return 'none';
    }

    /**
     * Verificação rápida (booleana)
     */
    public function isInjection(string $input): bool
    {
        return $this->detect($input)['is_injection'];
    }

    /**
     * Loga tentativa de injection para auditoria
     */
    public function logAttempt(string $input, array $result, ?int $userId = null): void
    {
        Log::warning('Prompt injection detected', [
            'user_id' => $userId,
            'input_preview' => mb_substr($input, 0, 200),
            'confidence' => $result['confidence'],
            'matches' => $result['matches'],
        ]);
    }
}
