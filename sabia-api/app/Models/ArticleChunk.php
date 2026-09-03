<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Pgvector\Laravel\Vector;

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
        'chunk_index' => 'integer',
        'keywords' => 'array',
        // pgvector/php converte array PHP ↔ formato '[a,b,c]' do pgvector.
        'embedding' => Vector::class,
    ];

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
