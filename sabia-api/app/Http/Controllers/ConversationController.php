<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->profile?->isGestor()) {
            $conversations = Conversation::where('source', 'direct')
                ->orWhere('source', 'widget')
                ->latest()
                ->get();
        } else {
            $conversations = Conversation::forUser($user->profile?->id)
                ->latest()
                ->get();
        }

        return response()->json($conversations);
    }

    public function messages(Request $request, $id): JsonResponse
    {
        $conversation = Conversation::findOrFail($id);

        // IDOR check
        if (!$request->user()->profile?->isGestor()) {
            if ($conversation->user_id !== $request->user()->profile?->id) {
                return response()->json(['message' => 'Não autorizado.'], 403);
            }
        }

        $messages = Message::where('conversation_id', $id)
            ->orderBy('created_at')
            ->get();

        return response()->json($messages);
    }

    public function close(Request $request, $id): JsonResponse
    {
        $conversation = Conversation::findOrFail($id);

        if (!$request->user()->profile?->isGestor()) {
            if ($conversation->user_id !== $request->user()->profile?->id) {
                return response()->json(['message' => 'Não autorizado.'], 403);
            }
        }

        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
        ]);

        $conversation->update([
            'is_closed' => true,
            'closed_at' => now(),
            'rating' => $data['rating'],
        ]);

        return response()->json($conversation);
    }

    public function transfer(Request $request, $id): JsonResponse
    {
        $conversation = Conversation::findOrFail($id);

        if (!$request->user()->profile?->isGestor()) {
            if ($conversation->user_id !== $request->user()->profile?->id) {
                return response()->json(['message' => 'Não autorizado.'], 403);
            }
        }

        $conversation->update([
            'is_closed' => true,
            'closed_at' => now(),
            'transfer_status' => 'transferred',
        ]);

        // TODO: SupportTransferService integration

        return response()->json($conversation);
    }

    public function export(Request $request, $id): JsonResponse
    {
        $conversation = Conversation::findOrFail($id);

        if (!$request->user()->profile?->isGestor()) {
            if ($conversation->user_id !== $request->user()->profile?->id) {
                return response()->json(['message' => 'Não autorizado.'], 403);
            }
        }

        $messages = Message::where('conversation_id', $id)
            ->orderBy('created_at')
            ->get();

        $lines = [
            "═══════════════════════════════════════",
            "CONVERSA — Sabiá Suporte",
            "═══════════════════════════════════════",
            "Data: " . \App\Lib\Utils::formatDateTime($conversation->created_at),
            "Canal: " . ucfirst($conversation->source),
            "Status: " . ($conversation->is_closed ? 'Encerrada' : 'Aberta'),
            $conversation->rating ? "Avaliação: " . str_repeat('⭐', $conversation->rating) . " ({$conversation->rating}/5)" : '',
            "═══════════════════════════════════════",
        ];

        foreach ($messages as $msg) {
            $role = match($msg->role) {
                'user' => 'Usuário',
                'assistant' => 'IA',
                default => 'Sistema',
            };
            $time = \Carbon\Carbon::parse($msg->created_at)->format('H:i');
            $lines[] = "[{$time}] {$role}:";
            $lines[] = $msg->content;
            $lines[] = '';
        }

        $lines[] = "═══════════════════════════════════════";
        $lines[] = "Exportado em: " . now()->format('d/m/Y H:i');

        return response()->json([
            'filename' => "conversa-{$conversation->id}.txt",
            'content' => implode("\n", array_filter($lines)),
        ]);
    }
}
