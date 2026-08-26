<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use \Carbon\Carbon;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::query()->latest();

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

        return response()->json($query->get());
    }
}
