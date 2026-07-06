<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArticleChunk extends Model
{
    protected $fillable = [
        'article_id',
        'content',
        'chunk_index',
        'embedding',
        'keywords',
    ];

    protected $casts = [
        'embedding' => 'array',
        'keywords' => 'array',
    ];

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
