<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use Illuminate\Http\Request;

class WidgetConversationController extends Controller
{
    public function index(Request $request)
    {
        $query = Conversation::where('source', 'widget')
            ->withCount('messages')
            ->with('messages:id,conversation_id,role,content,created_at');

        if ($request->has('status')) {
            match ($request->status) {
                'closed' => $query->where('is_closed', true),
                'open' => $query->where('is_closed', false),
                'transferred' => $query->where('transfer_status', 'transferred'),
                default => null,
            };
        }
        if ($request->has('rating')) {
            $query->where('rating', $request->rating);
        }
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        return response()->json(
            $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 20)
        );
    }

    public function show(Conversation $conversation)
    {
        if ($conversation->source !== 'widget') {
            abort(404);
        }
        $conversation->load('messages');
        return response()->json($conversation);
    }

    public function export(Conversation $conversation)
    {
        if ($conversation->source !== 'widget') {
            abort(404);
        }
        $conversation->load('messages');

        $lines = [];
        $lines[] = str_repeat('═', 50);
        $lines[] = 'CONVERSA — ' . ($conversation->title ?? 'Widget');
        $lines[] = str_repeat('═', 50);
        $lines[] = 'Data: ' . $conversation->created_at->format('d/m/Y H:i');
        $lines[] = 'Canal: Widget';
        $lines[] = 'Status: ' . ($conversation->is_closed ? 'Encerrada' : 'Ativa');
        if ($conversation->rating) {
            $lines[] = 'Avaliação: ' . str_repeat('⭐', $conversation->rating) . " ({$conversation->rating}/5)";
        }
        $lines[] = str_repeat('─', 50);
        $lines[] = '';

        foreach ($conversation->messages as $msg) {
            $role = $msg->role === 'user' ? 'Usuário' : ($msg->role === 'assistant' ? 'Sabiá' : 'Sistema');
            $lines[] = "[{$msg->created_at->format('H:i')}] {$role}:";
            $lines[] = $msg->content;
            $lines[] = '';
        }

        $lines[] = str_repeat('═', 50);
        $lines[] = 'Exportado em: ' . now()->format('d/m/Y H:i');

        return response(implode("\n", $lines), 200, [
            'Content-Type' => 'text/plain; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="conversa-widget-' . $conversation->id . '.txt"',
        ]);
    }
}
