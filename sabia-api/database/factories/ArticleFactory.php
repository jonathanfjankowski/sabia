<?php

namespace Database\Factories;

use App\Models\Article;
use App\Models\Profile;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Article>
 */
class ArticleFactory extends Factory
{
    protected $model = Article::class;

    public function definition(): array
    {
        $title = fake()->unique()->sentence(4);

        return [
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::random(4),
            'content' => 'Paragraph 1 content. '.fake()->paragraph()."\n\n"
                .'Paragraph 2 with more content. '.fake()->paragraph(),
            'summary' => fake()->sentence(),
            'access_level' => 'public',
            'status' => 'active',
            'version' => 1,
            'created_by' => Profile::factory(),
        ];
    }
}
