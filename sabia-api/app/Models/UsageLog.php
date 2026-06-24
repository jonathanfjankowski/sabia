<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UsageLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'tokens_used',
        'cost',
        'provider',
        'model',
    ];

    protected $casts = [
        'tokens_used' => 'integer',
        'cost' => 'decimal:6',
        'created_at' => 'datetime',
    ];

    // Relacionamentos
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Escopos
    public function scopeByPeriod($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    // Métodos utilitários
    public static function getTotalTokensForUser(int $userId, ?string $startDate = null, ?string $endDate = null): int
    {
        $query = self::forUser($userId);
        
        if ($startDate && $endDate) {
            $query->byPeriod($startDate, $endDate);
        }
        
        return $query->sum('tokens_used');
    }

    public static function getTotalCostForUser(int $userId, ?string $startDate = null, ?string $endDate = null): float
    {
        $query = self::forUser($userId);
        
        if ($startDate && $endDate) {
            $query->byPeriod($startDate, $endDate);
        }
        
        return (float) $query->sum('cost');
    }
}
