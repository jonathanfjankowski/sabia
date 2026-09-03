<?php

namespace App\Http\Controllers;

use App\Models\KnowledgeGap;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KnowledgeGapController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filter = $request->query('filter', 'all'); // all | open | resolved

        $query = KnowledgeGap::query();
        if ($filter === 'open') {
            $query->where('resolved', false);
        } elseif ($filter === 'resolved') {
            $query->where('resolved', true);
        }

        $gaps = $query->latest()->limit(min(max((int) $request->query('limit', 200), 1), 500))->get();

        return response()->json($gaps);
    }

    public function resolve(Request $request, $id): JsonResponse
    {
        $gap = KnowledgeGap::findOrFail($id);

        $gap->update([
            'resolved' => true,
            'resolved_by' => $request->user()->profile?->id,
            'resolved_at' => now(),
        ]);

        AuditService::record('knowledge_gap.resolve', 'KnowledgeGap', (string) $id, ['resolved' => false], ['resolved' => true]);

        return response()->json($gap);
    }
}
