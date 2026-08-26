<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use \Carbon\Carbon;

class SystemLogController extends Controller
{
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

        return response()->json($query->get());
    }
}
