<?php

namespace App\Services;

use App\Models\SystemLog;

class PromptInjectionDetector
{
    private array $patterns = [
        '/ignore\s+(all\s+)?previous\s+instructions/i',
        '/system\s*:/i',
        '/you\s+are\s+now/i',
        '/act\s+as\s+(a\s+)?(?!support)/i',
        '/forget\s+(everything|your\s+instructions)/i',
        '/new\s+instructions?\s*:/i',
        '/\[INST\]|\[\/INST\]/i',
        '/<\|system\|>/i',
    ];

    public function detect(string $input): bool
    {
        foreach ($this->patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return true;
            }
        }
        return false;
    }
}
