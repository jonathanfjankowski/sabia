<?php

namespace App\Models;

use Database\Factories\ArticleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Article extends Model
{
    /** @use HasFactory<ArticleFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'slug',
        'content',
        'summary',
        'category_id',
        'access_level',
        'status',
        'views_count',
        'helpful_yes',
        'helpful_no',
        'version',
        'created_by',
    ];

    protected $casts = [
        'views_count' => 'integer',
        'helpful_yes' => 'integer',
        'helpful_no' => 'integer',
        'version' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (Article $article) {
            if (empty($article->slug)) {
                $article->slug = Str::slug($article->title).'-'.Str::random(6);
            }
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'created_by');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(ArticleVersion::class);
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(ArticleChunk::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopePublicOnly($query)
    {
        return $query->where('access_level', 'public');
    }

    public function scopeInternalOnly($query)
    {
        return $query->where('access_level', 'internal');
    }

    public function scopeForAccessLevel($query, string $level)
    {
        return $level === 'internal'
            ? $query
            : $query->publicOnly();
    }

    public function registerFeedback(bool $helpful): void
    {
        if ($helpful) {
            $this->increment('helpful_yes');
        } else {
            $this->increment('helpful_no');
        }
    }
}
