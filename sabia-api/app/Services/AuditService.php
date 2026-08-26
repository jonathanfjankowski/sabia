<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
            'entity_type' => $entityType,
            'entity_id' => $entityId !== null ? (string) $entityId : null,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }
}
