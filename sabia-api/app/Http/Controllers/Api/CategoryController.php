<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::withCount('articles');

        // Filtros
        if ($request->has('active')) {
            $query->where('is_active', $request->boolean('active'));
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        // Incluir hierarquia
        if ($request->boolean('with_children')) {
            $query->with('children');
        }

        $categories = $query->ordered()->paginate($request->per_page ?? 50);

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'parent_id' => 'nullable|exists:categories,id',
            'order' => 'nullable|integer|min:0',
            'color' => 'nullable|string|max:7',
            'icon' => 'nullable|string|max:50',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        // Garantir slug único
        $baseSlug = $validated['slug'];
        $counter = 1;
        while (Category::where('slug', $validated['slug'])->exists()) {
            $validated['slug'] = $baseSlug . '-' . $counter++;
        }

        $category = Category::create($validated);

        return response()->json($category, 201);
    }

    public function show(Category $category)
    {
        $category->loadCount('articles');
        $category->load('parent', 'children');

        return response()->json($category);
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'parent_id' => 'nullable|exists:categories,id',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'sometimes|boolean',
            'color' => 'nullable|string|max:7',
            'icon' => 'nullable|string|max:50',
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
            $baseSlug = $validated['slug'];
            $counter = 1;
            while (Category::where('slug', $validated['slug'])->where('id', '!=', $category->id)->exists()) {
                $validated['slug'] = $baseSlug . '-' . $counter++;
            }
        }

        // Validar que parent_id não é auto-referência
        if (isset($validated['parent_id']) && $validated['parent_id'] == $category->id) {
            return response()->json(['message' => 'Uma categoria não pode ser pai de si mesma.'], 422);
        }

        $category->update($validated);

        return response()->json($category);
    }

    public function destroy(Category $category)
    {
        if ($category->articles()->count() > 0) {
            return response()->json([
                'message' => 'Não é possível excluir categoria com artigos associados. Remova os artigos primeiro.',
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Categoria excluída com sucesso.']);
    }
}
