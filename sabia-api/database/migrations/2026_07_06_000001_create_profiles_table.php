<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->onDelete('cascade');
            $table->string('full_name');
            $table->string('role')->default('operador')->check("role IN ('gestor', 'operador')");
            $table->boolean('is_active')->default(true);
            $table->string('avatar_url')->nullable();
            $table->string('phone')->nullable();
            $table->timestamps();
        });

        // Criar profiles para users existentes
        $users = DB::table('users')->get();
        foreach ($users as $user) {
            DB::table('profiles')->insert([
                'user_id' => $user->id,
                'full_name' => $user->name,
                'role' => $user->email === 'admin@sabia.com' ? 'gestor' : 'operador',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
