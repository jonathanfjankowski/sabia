<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Model Conversation - Representa uma sessão de chat
 */
class Conversation extends Model
{
    use HasFactory;

    /**
     * Atributos que podem ser atribuídos em massa
     */
    protected $fillable = [
        'session_id',
        'user_id',
        'access_level',
        'source',
        'user_ip',
        'user_agent',
        'metadata',
        'last_activity_at',
    ];

    /**
     * Atributos que devem ser convertidos
     */
    protected $casts = [
        'metadata' => 'array',
        'last_activity_at' => 'datetime',
    ];

    /**
     * Boot do model - gera session_id automaticamente
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($conversation) {
            if (empty($conversation->session_id)) {
                $conversation->session_id = Str::uuid();
            }
        });
    }

    /**
     * Relacionamentos
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function aiLogs(): HasMany
    {
        return $this->hasMany(AiInteractionLog::class);
    }

    /**
     * Escopo para filtrar por nível de acesso
     */
    public function scopeAccessLevel($query, string $level)
    {
        return $query->where('access_level', $level);
    }

    /**
     * Escopo para filtrar por fonte
     */
    public function scopeSource($query, string $source)
    {
        return $query->where('source', $source);
    }

    /**
     * Atualiza última atividade
     */
    public function touchActivity(): void
    {
        $this->update(['last_activity_at' => now()]);
    }

    /**
     * Obtém ou cria conversa por session_id
     */
    public static function getBySessionId(string $sessionId): ?self
    {
        return self::where('session_id', $sessionId)->first();
    }
}
