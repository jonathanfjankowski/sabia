<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemLogController extends Controller
{
    // Teto duro: system_logs cresce indefinidamente (incidentes geram centenas)
    private const MAX_RESULTS = 500;

    public function index(Request $request): JsonResponse
    {
        $query = SystemLog::query()->latest();

        if ($level = $request->query('level')) {
            $query->where('level', $level);
        }
        if ($context = $request->query('context')) {
            $query->where('context', $context);
        }
        if ($from = $request->query('from')) {
            $query->where('created_at', '>=', Carbon::parse($from));
        }
        if ($to = $request->query('to')) {
            $query->where('created_at', '<=', Carbon::parse($to));
        }

        return response()->json(
            $query->limit(min(max((int) $request->query('limit', 200), 1), self::MAX_RESULTS))->get()
        );
    }
}
