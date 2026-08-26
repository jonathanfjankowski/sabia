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
        return static::first() ?? static::create();
    }
}
