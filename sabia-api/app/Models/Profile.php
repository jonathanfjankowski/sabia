<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Profile extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'full_name',
        'role',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function articles(): HasMany
    {
        return $this->hasMany(Article::class, 'created_by');
    }

    public function articleVersions(): HasMany
    {
        return $this->hasMany(ArticleVersion::class, 'edited_by');
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'user_id');
    }

    public function resolvedGaps(): HasMany
    {
        return $this->hasMany(KnowledgeGap::class, 'resolved_by');
    }

    public function isGestor(): bool
    {
        return $this->role === 'gestor';
    }

    public function isOperador(): bool
    {
        return $this->role === 'operador';
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
