<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@sabia.com',
            'password' => bcrypt('password'),
        ]);

        // Chamar seeders
        $this->call([
            AiProviderSeeder::class,
            CategorySeeder::class,
            ArticleSeeder::class,
        ]);
    }
}
