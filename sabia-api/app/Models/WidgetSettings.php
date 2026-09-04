<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WidgetSettings extends Model
{
    protected $fillable = [
        'welcome_message',
        'support_link',
        'support_start_time',
        'support_end_time',
        'support_phone',
        'teams_webhook_url',
        'out_of_hours_message',
        'teams_notify_transfer',
        'teams_notify_gap',
        'teams_notify_out_of_hours',
        'allowed_domains',
        'maintenance_mode',
        'maintenance_message',
        'updated_by',
    ];

    protected $casts = [
        'support_start_time' => 'datetime:H:i',
        'support_end_time' => 'datetime:H:i',
        'teams_notify_transfer' => 'boolean',
        'teams_notify_gap' => 'boolean',
        'teams_notify_out_of_hours' => 'boolean',
        'allowed_domains' => 'array',
        'maintenance_mode' => 'boolean',
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'updated_by');
    }

    public static function current(): self
    {
        $key = 'widget_settings.current';

        // Atributos brutos no cache (modelo serializado vira
        // __PHP_Incomplete_Class com allowed_classes=false)
        if (is_array($cached = cache()->get($key))) {
            // setRawAttributes pula os casts no set (senão '[]' viraria '"[]"')
            $model = (new static)->setRawAttributes($cached, true);
            // Sem exists=true o save() vira INSERT com o id já gravado
            // (duplicate key / permission denied ao salvar da UI)
            $model->exists = array_key_exists($model->getKeyName(), $cached);

            return $model;
        }

        $settings = static::query()->first();

        if (! $settings) {
            try {
                $settings = static::create();
            } catch (\Throwable) {
                // Role sabia_widget só tem SELECT — instância em memória
                $settings = new static;
            }
        }

        cache()->put($key, $settings->getAttributes(), now()->addMinutes(5));

        return $settings;
    }

    public static function clearCache(): void
    {
        cache()->forget('widget_settings.current');
    }
}
