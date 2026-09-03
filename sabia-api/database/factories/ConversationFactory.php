<?php

namespace Database\Factories;

use App\Models\Conversation;
use App\Models\Profile;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Conversation>
 */
class ConversationFactory extends Factory
{
    protected $model = Conversation::class;

    public function definition(): array
    {
        return [
            'user_id' => Profile::factory(),
            'session_id' => (string) Str::uuid(),
            'source' => 'direct',
            'access_level' => 'internal',
            'title' => fake()->sentence(3),
            'is_closed' => false,
        ];
    }
}
