<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArticleVersion extends Model
{
    public $timestamps = false;

    protected $table = 'article_versions';

    protected $fillable = [
        'article_id',
        'version',
        'content',
        'edited_by',
    ];

    protected $casts = [
        'version' => 'integer',
        'created_at' => 'datetime',
    ];

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    public function editedBy(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'edited_by');
    }
}
