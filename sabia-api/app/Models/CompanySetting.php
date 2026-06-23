<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Model CompanySetting - Configurações da empresa (white label, branding)
 */
class CompanySetting extends Model
{
    use HasFactory;

    /**
     * Atributos que podem ser atribuídos em massa
     */
    protected $fillable = [
        'company_name',
        'logo_url',
        'primary_color',
        'secondary_color',
        'welcome_message',
        'contact_info',
        'enable_evaluations',
        'enable_audit_logs',
    ];

    /**
     * Atributos que devem ser convertidos
     */
    protected $casts = [
        'contact_info' => 'array',
        'enable_evaluations' => 'boolean',
        'enable_audit_logs' => 'boolean',
    ];

    /**
     * Obtém as configurações ativas da empresa
     */
    public static function getActive(): self
    {
        return self::firstOrCreate([]);
    }
}
