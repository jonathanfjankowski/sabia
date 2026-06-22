<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Model de Sessão de Chat
 * 
 * Representa uma sessão de conversa entre um usuário e o chatbot.
 */
class ChatSession extends Model
{
    use HasFactory;

    /**
     * Atributos que podem ser preenchidos em massa.
     */
    protected $fillable = [
        'session_id',
        'user_id',
        'visitor_id',
        'source',
        'ip_address',
        'user_agent',
        'last_activity_at',
    ];

    /**
     * Conversões de atributos.
     */
    protected $casts = [
        'last_activity_at' => 'datetime',
    ];

    /**
     * Boot do model - gera session_id automaticamente.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($session) {
            if (empty($session->session_id)) {
                $session->session_id = Str::uuid()->toString();
            }
        });
    }

    /**
     * Relacionamento com usuário.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relacionamento com mensagens.
     */
    public function messages()
    {
        return $this->hasMany(ChatMessage::class);
    }

    /**
     * Relacionamento com avaliações.
     */
    public function feedbackRatings()
    {
        return $this->hasMany(FeedbackRating::class, 'session_id');
    }

    /**
     * Escopo para sessões ativas (últimos 30 minutos).
     */
    public function scopeActive($query)
    {
        return $query->where('last_activity_at', '>=', now()->subMinutes(30));
    }

    /**
     * Escopo por fonte.
     */
    public function scopeBySource($query, string $source)
    {
        return $query->where('source', $source);
    }

    /**
     * Adiciona uma mensagem à sessão.
     */
    public function addMessage(string $role, string $content, array $metadata = []): ChatMessage
    {
        $this->update(['last_activity_at' => now()]);

        return $this->messages()->create([
            'role' => $role,
            'content' => $content,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Obtém as últimas N mensagens para contexto.
     */
    public function getRecentMessages(int $limit = 10): array
    {
        return $this->messages()
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->reverse()
            ->map(fn($msg) => [
                'role' => $msg->role,
                'content' => $msg->content,
            ])
            ->toArray();
    }

    /**
     * Verifica se a sessão é anônima.
     */
    public function isAnonymous(): bool
    {
        return $this->user_id === null && $this->visitor_id !== null;
    }
}
