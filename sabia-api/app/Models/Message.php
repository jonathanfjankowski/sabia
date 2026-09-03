<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory;
    protected $fillable = [
        'conversation_id',
        'role',
        'content',
        'images',
        'sources',
        'has_images',
        'confidence',
        'confidence_level',
    ];

    protected $casts = [
        'images' => 'array',
        'sources' => 'array',
        'has_images' => 'boolean',
        'confidence' => 'float',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
