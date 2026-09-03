<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Category;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Category::ordered()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
            'description' => 'nullable|string',
            'color' => 'sometimes|string|max:7',
            'icon' => 'sometimes|string|max:50',
            'sort_order' => 'sometimes|integer|min:0',
        ], [
            'name.unique' => 'Já existe uma categoria com este nome.',
        ]);

        $data['slug'] = Str::slug($data['name']);

        $category = Category::create($data);

        AuditService::record('category.create', 'Category', (string) $category->id, null, $category->toArray());

        return response()->json($category, 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $category = Category::findOrFail($id);

        $old = $category->toArray();

        $data = $request->validate([
            'name' => 'sometimes|string|max:255|unique:categories,name,'.$id,
            'description' => 'nullable|string',
            'color' => 'sometimes|string|max:7',
            'icon' => 'sometimes|string|max:50',
            'sort_order' => 'sometimes|integer|min:0',
        ], [
            'name.unique' => 'Já existe uma categoria com este nome.',
        ]);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $category->update($data);

        AuditService::record('category.update', 'Category', (string) $id, $old, $category->toArray());

        return response()->json($category);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $old = $category->toArray();

        // Soft-delete by moving articles to uncategorized
        Article::where('category_id', $category->id)->update(['category_id' => null]);
        $category->delete();

        AuditService::record('category.delete', 'Category', (string) $id, $old, null);

        return response()->json(['ok' => true]);
    }
}
