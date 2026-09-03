<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    // Teto duro: audit_logs cresce indefinidamente e a tela filtra no cliente
    private const MAX_RESULTS = 500;

    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::query()->with('profile')->latest();

        if ($from = $request->query('from')) {
            $query->where('created_at', '>=', Carbon::parse($from));
        }
        if ($to = $request->query('to')) {
            $query->where('created_at', '<=', Carbon::parse($to));
        }
        if ($action = $request->query('action')) {
            $query->where('action', $action);
        }
        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }

        $logs = $query->limit(min(max((int) $request->query('limit', 200), 1), self::MAX_RESULTS))->get()->map(function ($log) {
            return [
                'id' => $log->id,
                'user_id' => $log->user_id,
                'user_name' => $log->profile?->full_name,
                'action' => $log->action,
                'entity_type' => $log->entity_type,
                'entity_id' => $log->entity_id,
                'old_value' => $log->old_value,
                'new_value' => $log->new_value,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent,
                'created_at' => $log->created_at,
            ];
        });

        return response()->json($logs);
    }
}
