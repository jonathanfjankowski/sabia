<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model AiInteractionLog - Log de interações com IA
 */
class AiInteractionLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'message_id',
        'event_type',
        'prompt',
        'response',
        'tokens_used',
        'latency_ms',
        'error_message',
        'context',
    ];

    protected $casts = [
        'tokens_used' => 'integer',
        'latency_ms' => 'decimal:2',
        'context' => 'array',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }
}
