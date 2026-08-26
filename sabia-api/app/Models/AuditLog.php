<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

class AuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'action',
        'entity_type',
        'entity_id',
        'old_value',
        'new_value',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'old_value' => 'array',
        'new_value' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Autor da ação (User).
     *
     * IMPORTANTE: `audit_logs.user_id` referencia `users.id` (não `profiles.id`),
     * pois `AuditService::record()` grava `Auth::id()` (UUID do User).
     * Isso evita FK violation caso um User ainda não tenha Profile associado.
     *
     * O spec v3 §3.12 sugere FK para `profiles`, mas mantemos em `users` por
     * segurança. Use `profile()` para acessar o Profile (nome, role).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Profile do autor (via User → Profile).
     * Retorna null se o User não tem Profile.
     */
    public function profile(): HasOneThrough
    {
        return $this->hasOneThrough(
            Profile::class,
            User::class,
            'id',       // FK em users (users.id = audit_logs.user_id)
            'user_id',  // FK em profiles (profiles.user_id = users.id)
            'user_id',  // local PK em audit_logs
            'id',       // local PK em users
        );
    }

    public function scopeForPeriod($query, ?string $from, ?string $to)
    {
        if ($from) {
            $query->where('created_at', '>=', $from);
        }
        if ($to) {
            $query->where('created_at', '<=', $to);
        }
        return $query;
    }
}
