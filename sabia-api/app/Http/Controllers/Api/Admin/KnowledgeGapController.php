<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\KnowledgeGap;
use Illuminate\Http\Request;

class KnowledgeGapController extends Controller
{
    public function index(Request $request)
    {
        $query = KnowledgeGap::with(['conversation', 'resolver']);

        if ($request->has('resolved')) {
            $query->where('resolved', $request->boolean('resolved'));
        }

        if ($request->has('source')) {
            $query->bySource($request->source);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('question', 'LIKE', "%{$search}%");
        }

        $gaps = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 20);

        return response()->json($gaps);
    }

    public function resolve(Request $request, KnowledgeGap $knowledgeGap)
    {
        $validated = $request->validate([
            'resolution_notes' => 'nullable|string|max:2000',
        ]);

        $knowledgeGap->resolve(
            $request->user()->id,
            $validated['resolution_notes'] ?? null
        );

        return response()->json(['message' => 'Lacuna marcada como resolvida.']);
    }

    public function destroy(KnowledgeGap $knowledgeGap)
    {
        $knowledgeGap->delete();

        return response()->json(['message' => 'Lacuna excluída com sucesso.']);
    }
}
