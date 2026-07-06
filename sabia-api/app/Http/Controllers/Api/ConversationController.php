<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\ConversationCollection;
use App\Http\Requests\StoreConversationRequest;
use App\Http\Requests\UpdateConversationRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class ConversationController extends Controller
{
    /**
     * Display a listing of the user's conversations.
     */
    public function index(Request $request): ConversationCollection
    {
        $conversations = $request->user()
            ->conversations()
            ->with('aiProvider')
            ->orderBy('updated_at', 'desc')
            ->paginate(20);

        return new ConversationCollection($conversations);
    }

    /**
     * Store a newly created conversation.
     */
    public function store(StoreConversationRequest $request): ConversationResource
    {
        $validated = $request->validated();
        
        $conversation = $request->user()->conversations()->create([
            'title' => $validated['title'],
            'ai_provider_id' => $validated['ai_provider_id'] ?? null,
            'model' => $validated['model'] ?? null,
            'system_prompt' => $validated['system_prompt'] ?? null,
        ]);

        return new ConversationResource($conversation->load('aiProvider'));
    }

    /**
     * Display the specified conversation with its messages.
     */
    public function show(Request $request, int $id): ConversationResource
    {
        $conversation = $request->user()
            ->conversations()
            ->with(['messages', 'aiProvider'])
            ->findOrFail($id);

        return new ConversationResource($conversation);
    }

    /**
     * Update the specified conversation.
     */
    public function update(UpdateConversationRequest $request, int $id): ConversationResource
    {
        $conversation = $request->user()
            ->conversations()
            ->findOrFail($id);

        $validated = $request->validated();

        $conversation->update($validated);

        return new ConversationResource($conversation->fresh('aiProvider'));
    }

    /**
     * Remove the specified conversation.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $conversation = $request->user()
            ->conversations()
            ->findOrFail($id);

        $conversation->delete();

        return response()->json(['message' => 'Conversation deleted successfully']);
    }

    /**
     * Export conversation as TXT
     */
    public function export(Request $request, int $id)
    {
        $conversation = $request->user()
            ->conversations()
            ->with('messages')
            ->findOrFail($id);

        $lines = [];
        $lines[] = str_repeat('═', 50);
        $lines[] = 'CONVERSA — ' . ($conversation->title ?? 'Sabiá Chat');
        $lines[] = str_repeat('═', 50);
        $lines[] = 'Data: ' . $conversation->created_at->format('d/m/Y H:i');
        $lines[] = 'Canal: ' . $conversation->source;
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
            'Content-Disposition' => 'attachment; filename="conversa-' . $conversation->id . '.txt"',
        ]);
    }
}
