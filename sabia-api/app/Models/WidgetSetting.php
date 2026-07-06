<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WidgetSetting extends Model
{
    protected $fillable = [
        'welcome_message',
        'support_link',
        'support_start_time',
        'support_end_time',
        'support_phone',
        'teams_webhook_url',
        'out_of_hours_message',
        'maintenance_message',
        'allowed_domains',
        'maintenance_mode',
        'teams_notify_transfer',
        'teams_notify_gap',
        'teams_notify_out_of_hours',
        'updated_by',
    ];

    protected $casts = [
        'allowed_domains' => 'array',
        'maintenance_mode' => 'boolean',
        'support_start_time' => 'string',
        'support_end_time' => 'string',
        'teams_notify_transfer' => 'boolean',
        'teams_notify_gap' => 'boolean',
        'teams_notify_out_of_hours' => 'boolean',
    ];

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function getActive(): self
    {
        return self::firstOrCreate([]);
    }

    public function isInMaintenance(): bool
    {
        return $this->maintenance_mode;
    }

    public function isDomainAllowed(string $domain): bool
    {
        $domains = $this->allowed_domains ?? ['*'];
        if (in_array('*', $domains)) return true;
        foreach ($domains as $allowed) {
            if (str_ends_with($domain, $allowed)) return true;
        }
        return false;
    }

    public function isWithinBusinessHours(): bool
    {
        $now = now();
        $startTime = $this->support_start_time ?? '08:00';
        $endTime = $this->support_end_time ?? '18:00';

        [$startH, $startM] = explode(':', $startTime);
        [$endH, $endM] = explode(':', $endTime);

        $start = $now->copy()->setHour((int)$startH)->setMinute((int)$startM)->setSecond(0);
        $end = $now->copy()->setHour((int)$endH)->setMinute((int)$endM)->setSecond(0);

        return $now->between($start, $end);
    }
}
