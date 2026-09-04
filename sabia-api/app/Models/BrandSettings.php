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
        $key = 'brand_settings.current';

        // Atributos brutos no cache (modelo serializado vira
        // __PHP_Incomplete_Class com allowed_classes=false)
        if (is_array($cached = cache()->get($key))) {
            // setRawAttributes pula os casts no set
            $model = (new static)->setRawAttributes($cached, true);
            // Sem exists=true o save() vira INSERT com o id já gravado
            // (duplicate key / permission denied ao salvar da UI)
            $model->exists = array_key_exists($model->getKeyName(), $cached);

            return $model;
        }

        $settings = static::query()->first();

        if (! $settings) {
            try {
                $settings = static::create([
                    'app_name' => 'Sabiá',
                    'primary_color' => '#6366f1',
                    'secondary_color' => '#4f46e5',
                    'font' => 'Inter',
                ]);
            } catch (\Throwable) {
                // Role sabia_widget só tem SELECT — defaults em memória
                $settings = (new static)->forceFill([
                    'app_name' => 'Sabiá',
                    'primary_color' => '#6366f1',
                    'secondary_color' => '#4f46e5',
                    'font' => 'Inter',
                ]);
            }
        }

        cache()->put($key, $settings->getAttributes(), now()->addMinutes(5));

        return $settings;
    }

    public static function clearCache(): void
    {
        cache()->forget('brand_settings.current');
    }
}
