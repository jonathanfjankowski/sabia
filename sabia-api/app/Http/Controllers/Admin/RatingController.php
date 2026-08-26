<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RatingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Conversation::whereNotNull('rating')->latest();

        if ($source = $request->query('source')) {
            $query->where('source', $source);
        }

        $ratings = $query->get()->map(fn ($c) => [
            'id' => $c->id,
            'conversation_id' => $c->id,
            'user_name' => $c->user?->full_name ?? 'Anônimo',
            'rating' => $c->rating,
            'source' => $c->source,
            'title' => $c->title,
            'created_at' => $c->created_at,
        ]);

        return response()->json($ratings);
    }
}
