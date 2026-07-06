<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Evaluation;
use App\Models\Conversation;
use Illuminate\Http\Request;

class RatingController extends Controller
{
    public function index(Request $request)
    {
        $query = Evaluation::with(['message.conversation', 'user'])
            ->whereHas('message.conversation');

        if ($request->has('rating')) {
            $query->where('rating', $request->rating);
        }
        if ($request->has('source')) {
            $query->whereHas('message.conversation', fn($q) => $q->where('source', $request->source));
        }
        if ($request->has('date_from')) {
            $query->whereDate('evaluations.created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('evaluations.created_at', '<=', $request->date_to);
        }

        $ratings = $query->orderBy('evaluations.created_at', 'desc')->paginate($request->per_page ?? 20);

        // Stats
        $stats = [
            'total' => Evaluation::count(),
            'average' => (float) Evaluation::avg('rating'),
            'distribution' => [
                1 => Evaluation::where('rating', 1)->count(),
                2 => Evaluation::where('rating', 2)->count(),
                3 => Evaluation::where('rating', 3)->count(),
                4 => Evaluation::where('rating', 4)->count(),
                5 => Evaluation::where('rating', 5)->count(),
            ],
        ];

        return response()->json([
            'data' => $ratings,
            'stats' => $stats,
        ]);
    }
}
