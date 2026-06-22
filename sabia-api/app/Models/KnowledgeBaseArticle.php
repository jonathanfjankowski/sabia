<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Model de Artigo da Base de Conhecimento
 * 
 * Representa artigos que serão usados como base para
 * as respostas do chatbot via RAG.
 */
class KnowledgeBaseArticle extends Model
{
    use HasFactory;

    /**
     * Atributos que podem ser preenchidos em massa.
     */
    protected $fillable = [
        'title',
        'slug',
        'content',
        'summary',
        'category_id',
        'author_id',
        'tags',
        'published',
        'views',
        'average_rating',
    ];

    /**
     * Conversões de atributos.
     */
    protected $casts = [
        'tags' => 'array',
        'published' => 'boolean',
        'average_rating' => 'decimal:2',
    ];

    /**
     * Boot do model - gera slug automaticamente.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($article) {
            if (empty($article->slug)) {
                $article->slug = Str::slug($article->title);
            }
        });

        static::updating(function ($article) {
            // Atualiza slug se o título mudar
            if ($article->isDirty('title')) {
                $article->slug = Str::slug($article->title);
            }
        });
    }

    /**
     * Relacionamento com categoria.
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Relacionamento com autor.
     */
    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /**
     * Relacionamento com embeddings.
     */
    public function embeddings()
    {
        return $this->morphMany(Embedding::class, 'embeddable');
    }

    /**
     * Relacionamento com avaliações.
     */
    public function feedbackRatings()
    {
        return $this->hasMany(FeedbackRating::class, 'knowledge_base_article_id');
    }

    /**
     * Escopo para artigos publicados.
     */
    public function scopePublished($query)
    {
        return $query->where('published', true);
    }

    /**
     * Escopo para busca por tags.
     */
    public function scopeWithTag($query, string $tag)
    {
        return $query->whereJsonContains('tags', $tag);
    }

    /**
     * Incrementa contador de visualizações.
     */
    public function incrementViews(): void
    {
        $this->increment('views');
    }

    /**
     * Calcula e atualiza a avaliação média.
     */
    public function updateAverageRating(): void
    {
        $average = $this->feedbackRatings()->avg('rating');
        $this->update(['average_rating' => $average ?? 0]);
    }

    /**
     * Verifica se o artigo tem embeddings gerados.
     */
    public function hasEmbeddings(): bool
    {
        return $this->embeddings()->exists();
    }
}
