<?php

namespace Database\Seeders;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProfileSeeder extends Seeder
{
    public function run(): void
    {
        // Criar profile para admin
        $admin = User::where('email', 'admin@sabia.com')->first();
        if ($admin && !Profile::where('user_id', $admin->id)->exists()) {
            Profile::create([
                'user_id' => $admin->id,
                'full_name' => $admin->name,
                'role' => 'gestor',
                'is_active' => true,
            ]);
            $this->command->info('Profile do admin criado com role gestor.');
        }

        // Criar profiles para outros users
        $users = User::where('email', '!=', 'admin@sabia.com')->get();
        foreach ($users as $user) {
            if (!Profile::where('user_id', $user->id)->exists()) {
                Profile::create([
                    'user_id' => $user->id,
                    'full_name' => $user->name,
                    'role' => 'operador',
                    'is_active' => true,
                ]);
            }
        }

        $this->command->info('Profiles criados para todos os usuários.');
    }
}
