<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Model de Mensagem do Chat
 * 
 * Representa uma mensagem individual em uma sessão de chat.
 */
class ChatMessage extends Model
{
    use HasFactory;

    /**
     * Roles possíveis para mensagens
     */
    const ROLE_USER = 'user';
    const ROLE_ASSISTANT = 'assistant';
    const ROLE_SYSTEM = 'system';

    /**
     * Atributos que podem ser preenchidos em massa.
     */
    protected $fillable = [
        'chat_session_id',
        'role',
        'content',
        'metadata',
        'confidence_score',
    ];

    /**
     * Conversões de atributos.
     */
    protected $casts = [
        'metadata' => 'array',
        'confidence_score' => 'decimal:4',
    ];

    /**
     * Relacionamento com sessão de chat.
     */
    public function chatSession()
    {
        return $this->belongsTo(ChatSession::class);
    }

    /**
     * Relacionamento com avaliação.
     */
    public function feedbackRating()
    {
        return $this->hasOne(FeedbackRating::class, 'chat_message_id');
    }

    /**
     * Escopo para mensagens de usuário.
     */
    public function scopeUser($query)
    {
        return $query->where('role', self::ROLE_USER);
    }

    /**
     * Escopo para mensagens do assistente.
     */
    public function scopeAssistant($query)
    {
        return $query->where('role', self::ROLE_ASSISTANT);
    }

    /**
     * Verifica se a mensagem é do usuário.
     */
    public function isUser(): bool
    {
        return $this->role === self::ROLE_USER;
    }

    /**
     * Verifica se a mensagem é do assistente.
     */
    public function isAssistant(): bool
    {
        return $this->role === self::ROLE_ASSISTANT;
    }

    /**
     * Obtém artigos referenciados no metadata.
     */
    public function getReferencedArticles(): array
    {
        return $this->metadata['referenced_articles'] ?? [];
    }

    /**
     * Atualiza score de confiança.
     */
    public function updateConfidenceScore(float $score): void
    {
        $this->update(['confidence_score' => min(1.0, max(0.0, $score))]);
    }
}
