<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Model de Avaliação/Feedback
 * 
 * Armazena avaliações dos usuários sobre respostas do chatbot
 * ou artigos da base de conhecimento.
 */
class FeedbackRating extends Model
{
    use HasFactory;

    /**
     * Atributos que podem ser preenchidos em massa.
     */
    protected $fillable = [
        'chat_message_id',
        'knowledge_base_article_id',
        'rating',
        'comment',
        'session_id',
        'ip_address',
    ];

    /**
     * Conversões de atributos.
     */
    protected $casts = [
        'rating' => 'integer',
    ];

    /**
     * Relacionamento com mensagem do chat.
     */
    public function chatMessage()
    {
        return $this->belongsTo(ChatMessage::class, 'chat_message_id');
    }

    /**
     * Relacionamento com artigo da base de conhecimento.
     */
    public function knowledgeBaseArticle()
    {
        return $this->belongsTo(KnowledgeBaseArticle::class, 'knowledge_base_article_id');
    }

    /**
     * Valida o rating (deve estar entre 1 e 5).
     */
    public static function boot()
    {
        parent::boot();

        static::creating(function ($rating) {
            if ($rating->rating < 1 || $rating->rating > 5) {
                throw new \InvalidArgumentException('Rating deve estar entre 1 e 5');
            }
        });

        static::updating(function ($rating) {
            if ($rating->isDirty('rating') && ($rating->rating < 1 || $rating->rating > 5)) {
                throw new \InvalidArgumentException('Rating deve estar entre 1 e 5');
            }
        });
    }

    /**
     * Escopo para ratings positivos (4-5 estrelas).
     */
    public function scopePositive($query)
    {
        return $query->where('rating', '>=', 4);
    }

    /**
     * Escopo para ratings negativos (1-2 estrelas).
     */
    public function scopeNegative($query)
    {
        return $query->where('rating', '<=', 2);
    }

    /**
     * Calcula a média de ratings.
     */
    public static function getAverageForModel(string $modelType, int $modelId): float
    {
        return self::where($modelType . '_id', $modelId)
            ->avg('rating') ?? 0;
    }

    /**
     * Verifica se já existe um rating para esta sessão e modelo.
     */
    public static function existsForSessionAndModel(string $sessionId, string $modelType, int $modelId): bool
    {
        return self::where('session_id', $sessionId)
            ->where($modelType . '_id', $modelId)
            ->exists();
    }
}
