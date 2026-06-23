<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Model Message - Representa uma mensagem em uma conversa
 */
class Message extends Model
{
    use HasFactory;

    /**
     * Atributos que podem ser atribuídos em massa
     */
    protected $fillable = [
        'conversation_id',
        'role',
        'content',
        'citations',
        'confidence_score',
        'is_flagged',
        'flag_reason',
    ];

    /**
     * Atributos que devem ser convertidos
     */
    protected $casts = [
        'citations' => 'array',
        'confidence_score' => 'decimal:2',
        'is_flagged' => 'boolean',
    ];

    /**
     * Relacionamentos
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function evaluation(): HasMany
    {
        return $this->hasMany(Evaluation::class);
    }

    public function aiLog(): HasMany
    {
        return $this->hasMany(AiInteractionLog::class);
    }

    /**
     * Escopo para mensagens de um determinado role
     */
    public function scopeRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    /**
     * Escopo para mensagens sinalizadas
     */
    public function scopeFlagged($query)
    {
        return $query->where('is_flagged', true);
    }

    /**
     * Verifica se a mensagem tem citações
     */
    public function hasCitations(): bool
    {
        return !empty($this->citations);
    }

    /**
     * Obtém artigo citado pelo índice
     */
    public function getCitationArticle(int $index): ?Article
    {
        $citations = $this->citations ?? [];
        if (!isset($citations[$index]['article_id'])) {
            return null;
        }

        return Article::find($citations[$index]['article_id']);
    }
}
