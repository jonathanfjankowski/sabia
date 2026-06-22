<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Model Article - Representa um artigo da base de conhecimento
 */
class Article extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Atributos que podem ser atribuídos em massa
     */
    protected $fillable = [
        'title',
        'slug',
        'summary',
        'content',
        'category_id',
        'author_id',
        'tags',
        'is_published',
        'published_at',
        'views_count',
        'avg_rating',
        'rating_count',
        'content_embedding',
    ];

    /**
     * Atributos que devem ser convertidos
     */
    protected $casts = [
        'tags' => 'array',
        'is_published' => 'boolean',
        'published_at' => 'datetime',
        'views_count' => 'integer',
        'avg_rating' => 'decimal:2',
        'rating_count' => 'integer',
        'content_embedding' => 'array', // Array de floats para o embedding
    ];

    /**
     * Relacionamentos
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class);
    }

    /**
     * Escopo para artigos publicados
     */
    public function scopePublished($query)
    {
        return $query->where('is_published', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    /**
     * Escopo para busca por tags
     */
    public function scopeWithTag($query, string $tag)
    {
        return $query->whereJsonContains('tags', $tag);
    }

    /**
     * Incrementa contador de visualizações
     */
    public function incrementViews(): void
    {
        $this->increment('views_count');
    }

    /**
     * Atualiza avaliação média após nova avaliação
     */
    public function updateRating(): void
    {
        $stats = $this->evaluations()
            ->selectRaw('AVG(rating) as avg, COUNT(*) as count')
            ->first();

        $this->update([
            'avg_rating' => $stats->avg ?? 0,
            'rating_count' => $stats->count ?? 0,
        ]);
    }
}
