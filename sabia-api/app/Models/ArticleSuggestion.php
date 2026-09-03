<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArticleSuggestion extends Model
{
    protected $fillable = [
        'suggested_by',
        'category_id',
        'title',
        'content',
        'summary',
        'access_level',
        'status',
        'reviewed_by',
        'review_notes',
        'article_id',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function suggestedBy(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'suggested_by');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'reviewed_by');
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeBySuggester($query, $profileId)
    {
        return $query->where('suggested_by', $profileId);
    }
}
