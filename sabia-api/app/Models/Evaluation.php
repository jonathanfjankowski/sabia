<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model Evaluation - Representa uma avaliação de resposta
 */
class Evaluation extends Model
{
    use HasFactory;

    protected $fillable = [
        'message_id',
        'user_id',
        'rating',
        'feedback',
        'sentiment',
    ];

    protected $casts = [
        'rating' => 'integer',
    ];

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
