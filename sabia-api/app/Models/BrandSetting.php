<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandSetting extends Model
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

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function getActive(): self
    {
        return self::firstOrCreate([]);
    }

    public function getCssVariables(): array
    {
        return [
            '--sabia-primary' => $this->primary_color ?? '#6366f1',
            '--sabia-secondary' => $this->secondary_color ?? '#4f46e5',
            '--sabia-font' => $this->font ?? 'Inter',
        ];
    }
}
