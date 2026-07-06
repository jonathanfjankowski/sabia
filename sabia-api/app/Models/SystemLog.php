<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemLog extends Model
{
    protected $fillable = ['level', 'context', 'message', 'payload'];

    protected $casts = ['payload' => 'array'];

    public function scopeByLevel($query, string $level)
    {
        return $query->where('level', $level);
    }

    public function scopeByContext($query, string $context)
    {
        return $query->where('context', $context);
    }

    public static function record(string $level, string $context, string $message, ?array $payload = null): self
    {
        return self::create(compact('level', 'context', 'message', 'payload'));
    }
}
