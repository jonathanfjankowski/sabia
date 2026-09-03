<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class AuditService
{
    public static function record(
        string $action,
        ?string $entityType = null,
        ?string $entityId = null,
        mixed $oldValue = null,
        mixed $newValue = null,
        ?Request $request = null,
    ): void {
        $request = $request ?? request();

        // Grava User UUID (não Profile) — ver AuditLog::user() docblock.
        $userId = Auth::id();

        AuditLog::create([
            'user_id' => $userId,
            'action' => $action,
            // Normaliza "AiSettings" → "ai_settings": os callers passam o
            // nome da classe; o banco/filtros esperam snake_case
            'entity_type' => $entityType !== null ? Str::snake($entityType) : null,
            'entity_id' => $entityId !== null ? (string) $entityId : null,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }
}
