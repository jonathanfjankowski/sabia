<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KnowledgeGap extends Model
{
    protected $fillable = [
        'question',
        'context',
        'conversation_id',
        'session_id',
        'source',
        'resolved',
        'resolved_by',
        'resolved_at',
        'resolution_notes',
    ];

    protected $casts = [
        'resolved' => 'boolean',
        'resolved_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function scopeUnresolved($query)
    {
        return $query->where('resolved', false);
    }

    public function scopeBySource($query, string $source)
    {
        return $query->where('source', $source);
    }

    public function resolve(int $userId, ?string $notes = null): void
    {
        $this->update([
            'resolved' => true,
            'resolved_by' => $userId,
            'resolved_at' => now(),
            'resolution_notes' => $notes,
        ]);
    }
}
