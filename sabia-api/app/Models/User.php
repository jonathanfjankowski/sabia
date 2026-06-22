<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Model de Usuário do sistema Sabiá
 * 
 * Representa administradores e operadores que gerenciam
 * a base de conhecimento e monitoram o chatbot.
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Roles disponíveis
     */
    const ROLE_ADMIN = 'admin';
    const ROLE_OPERATOR = 'operator';

    /**
     * Atributos que podem ser preenchidos em massa.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    /**
     * Atributos que devem ser ocultados na serialização.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Conversões de atributos.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * Verifica se o usuário é administrador.
     */
    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    /**
     * Verifica se o usuário é operador.
     */
    public function isOperator(): bool
    {
        return $this->role === self::ROLE_OPERATOR;
    }

    /**
     * Relacionamento com artigos da base de conhecimento (como autor).
     */
    public function articles()
    {
        return $this->hasMany(KnowledgeBaseArticle::class, 'author_id');
    }

    /**
     * Relacionamento com sessões de chat.
     */
    public function chatSessions()
    {
        return $this->hasMany(ChatSession::class);
    }

    /**
     * Relacionamento com logs de auditoria.
     */
    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }
}
