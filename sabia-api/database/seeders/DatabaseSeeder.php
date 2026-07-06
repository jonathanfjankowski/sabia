<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Criar usuário admin
        User::firstOrCreate(
            ['email' => 'admin@sabia.com'],
            [
                'name' => 'Admin User',
                'email' => 'admin@sabia.com',
                'password' => Hash::make('password'),
            ]
        );

        $this->call([
            ProfileSeeder::class,
            AiProviderSeeder::class,
            CategorySeeder::class,
            ArticleSeeder::class,
        ]);
    }
}
