<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DocumentController extends Controller
{
    /**
     * Display a listing of the user's documents.
     */
    public function index(Request $request): JsonResponse
    {
        $documents = $request->user()
            ->documents()
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json($documents);
    }

    /**
     * Store a newly created document.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content_json' => 'nullable|array',
        ]);

        $document = $request->user()->documents()->create([
            'title' => $validated['title'],
            'content_json' => $validated['content_json'] ?? null,
            'word_count' => 0,
        ]);

        return response()->json($document, 201);
    }

    /**
     * Display the specified document.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $document = $request->user()
            ->documents()
            ->findOrFail($id);

        return response()->json($document);
    }

    /**
     * Update the specified document.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $document = $request->user()
            ->documents()
            ->findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'content_json' => 'nullable|array',
        ]);

        $document->update($validated);
        
        // Atualizar contagem de palavras se o conteúdo mudou
        if (isset($validated['content_json'])) {
            $document->updateWordCount();
            $document->save();
        }

        return response()->json($document);
    }

    /**
     * Remove the specified document.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $document = $request->user()
            ->documents()
            ->findOrFail($id);

        $document->delete();

        return response()->json(['message' => 'Document deleted successfully']);
    }

    /**
     * Apply AI action to document.
     */
    public function aiAction(Request $request, int $id): JsonResponse
    {
        $document = $request->user()
            ->documents()
            ->findOrFail($id);

        $validated = $request->validate([
            'action' => 'required|string|in:improve,summarize,expand,translate,correct',
            'selection' => 'nullable|array',
            'instructions' => 'nullable|string',
        ]);

        // TODO: Implementar integração com serviço de IA
        // Por enquanto, retorna resposta placeholder
        return response()->json([
            'message' => 'AI action queued for processing',
            'action' => $validated['action'],
            'document_id' => $document->id,
        ]);
    }
}
