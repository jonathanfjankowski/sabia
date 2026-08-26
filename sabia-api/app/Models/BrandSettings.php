<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandSettings extends Model
{
    protected $fillable = [
        'app_name',
        'logo_url',
        'favicon_url',
        'primary_color',
        'secondary_color',
        'font',
        'updated_by',
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'updated_by');
    }

    public static function current(): self
    {
        return static::first() ?? static::create([
            'app_name' => 'Sabiá',
            'primary_color' => '#6366f1',
            'secondary_color' => '#4f46e5',
            'font' => 'Inter',
        ]);
    }
}
