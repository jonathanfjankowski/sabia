<?php

namespace App\Services;

use App\Models\SystemLog;

class SystemLogService
{
    public function log(string $level, string $context, string $message, array $payload = []): void
    {
        try {
            (new SystemLog)->forceFill([
                'level' => $level,
                'context' => $context,
                'message' => $message,
                'payload' => $payload,
                'created_at' => now(),
            ])->save();
        } catch (\Throwable $e) {
            app('log')->error("SystemLog write failed: {$e->getMessage()}", [
                'level' => $level,
                'context' => $context,
                'message' => $message,
            ]);
        }
    }

    public static function record(string $level, string $context, string $message, array $payload = []): void
    {
        app(self::class)->log($level, $context, $message, $payload);
    }
}
