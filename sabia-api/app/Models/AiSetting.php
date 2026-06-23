<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Model AiSetting - Configurações de IA (provedor, modelo, parâmetros)
 */
class AiSetting extends Model
{
    use HasFactory;

    /**
     * Atributos que podem ser atribuídos em massa
     */
    protected $fillable = [
        'provider',
        'model',
        'api_key',
        'system_prompt',
        'max_tokens',
        'temperature',
        'top_k',
        'confidence_threshold',
        'enable_rag',
        'enable_citations',
        'fallback_providers',
    ];

    /**
     * Atributos que devem ser convertidos
     */
    protected $casts = [
        'max_tokens' => 'integer',
        'temperature' => 'decimal:2',
        'top_k' => 'integer',
        'confidence_threshold' => 'decimal:2',
        'enable_rag' => 'boolean',
        'enable_citations' => 'boolean',
        'fallback_providers' => 'array',
    ];

    /**
     * Obtém as configurações ativas de IA
     */
    public static function getActive(): self
    {
        return self::firstOrCreate([]);
    }

    /**
     * Verifica se o provedor está configurado
     */
    public function isConfigured(): bool
    {
        return !empty($this->api_key);
    }
}
