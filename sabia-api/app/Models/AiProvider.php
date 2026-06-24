<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiProvider extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'api_key',
        'endpoint',
        'is_active',
        'config',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'config' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Escopo para providers ativos
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Métodos estáticos para factory pattern
    public static function getProviderByName(string $name): ?self
    {
        return self::where('name', $name)->first();
    }

    public static function getDefaultProvider(): ?self
    {
        return self::active()->first();
    }
}
