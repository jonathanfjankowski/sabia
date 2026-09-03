<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WidgetConversationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $conversations = Conversation::where('source', 'widget')
            ->latest()
            ->limit(min(max((int) $request->query('limit', 200), 1), 500))
            ->get();

        return response()->json($conversations);
    }

    public function export(Request $request, $id): JsonResponse
    {
        $conversation = Conversation::where('source', 'widget')->findOrFail($id);
        $messages = Message::where('conversation_id', $id)->orderBy('created_at')->get();

        $lines = [
            '═══════════════════════════════════════',
            'CONVERSA — Widget',
            '═══════════════════════════════════════',
            'Data: '.Carbon::parse($conversation->created_at)->format('d/m/Y H:i'),
            'Canal: Widget',
            'Status: '.($conversation->is_closed ? 'Encerrada' : 'Aberta'),
            $conversation->rating ? 'Avaliação: '.str_repeat('⭐', $conversation->rating) : '',
            '═══════════════════════════════════════',
        ];

        foreach ($messages as $msg) {
            $role = match ($msg->role) {
                'user' => 'Usuário', 'assistant' => 'IA', default => 'Sistema'
            };
            $time = Carbon::parse($msg->created_at)->format('H:i');
            $lines[] = "[{$time}] {$role}:\n{$msg->content}\n";
        }

        return response()->json([
            'filename' => "widget-{$conversation->id}.txt",
            'content' => implode("\n", array_filter($lines)),
        ]);
    }
}
