<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KnowledgeGap extends Model
{
    protected $fillable = [
        'question',
        'conversation_id',
        'session_id',
        'resolved',
        'resolved_by',
        'resolved_at',
        'teams_notified',
    ];

    protected $casts = [
        'resolved' => 'boolean',
        'resolved_at' => 'datetime',
        'teams_notified' => 'boolean',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'resolved_by');
    }

    public function scopeUnresolved($query)
    {
        return $query->where('resolved', false);
    }
}
