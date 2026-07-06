<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Profile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('profile');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('role')) {
            $query->whereHas('profile', function ($q) use ($request) {
                $q->where('role', $request->role);
            });
        }

        if ($request->has('active')) {
            $query->whereHas('profile', function ($q) use ($request) {
                $q->where('is_active', $request->boolean('active'));
            });
        }

        $users = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 15);

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string|in:gestor,operador',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        Profile::create([
            'user_id' => $user->id,
            'full_name' => $validated['name'],
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
        ]);

        $user->load('profile');

        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        $user->load('profile');

        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:8|confirmed',
            'role' => 'sometimes|string|in:gestor,operador',
            'is_active' => 'sometimes|boolean',
            'phone' => 'nullable|string|max:20',
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }
        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }
        $user->save();

        // Atualizar profile
        $profile = $user->profile;
        if ($profile) {
            if (isset($validated['name'])) {
                $profile->full_name = $validated['name'];
            }
            if (isset($validated['role'])) {
                $profile->role = $validated['role'];
            }
            if (isset($validated['is_active'])) {
                $profile->is_active = $validated['is_active'];
            }
            if (isset($validated['phone'])) {
                $profile->phone = $validated['phone'];
            }
            $profile->save();
        }

        $user->load('profile');

        return response()->json($user);
    }

    public function destroy(User $user)
    {
        // Impedir exclusão do próprio usuário
        if (request()->user()->id === $user->id) {
            return response()->json(['message' => 'Você não pode excluir seu próprio usuário.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'Usuário excluído com sucesso.']);
    }
}
