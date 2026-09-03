<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = Profile::with('user')->get();

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email|unique:users,email',
            'full_name' => 'required|string|max:255',
            'role' => 'in:gestor,operador',
            'is_active' => 'boolean',
        ]);

        DB::transaction(function () use ($data) {
            $user = User::create([
                'email' => $data['email'],
                'password' => bcrypt(Str::random(20)),
            ]);

            Profile::create([
                'user_id' => $user->id,
                'full_name' => $data['full_name'],
                'role' => $data['role'] ?? 'operador',
                'is_active' => $data['is_active'] ?? true,
            ]);
        });

        AuditService::record('user.create', 'Profile', $data['email'], null, $data);

        return response()->json(['ok' => true], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $profile = Profile::findOrFail($id);
        $old = $profile->toArray();

        $data = $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'role' => 'sometimes|in:gestor,operador',
            'is_active' => 'sometimes|boolean',
        ]);

        $profile->update($data);

        AuditService::record('user.update', 'Profile', $id, $old, $profile->toArray());

        return response()->json($profile);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $profile = Profile::findOrFail($id);
        $profile->update(['is_active' => false]);

        AuditService::record('user.deactivate', 'Profile', $id, ['is_active' => true], ['is_active' => false]);

        return response()->json(['ok' => true]);
    }
}
