<?php

namespace App\Models;

use App\Casts\Encryptable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiSettings extends Model
{
    protected $fillable = [
        'provider',
        'endpoint',
        'api_key',
        'model',
        'embedding_provider',
        'embedding_model',
        'embedding_endpoint',
        'embedding_api_key',
        'temperature',
        'max_tokens',
        'stream_timeout_seconds',
        'system_prompt',
        'chunk_size',
        'chunk_overlap',
        'rag_top_n',
        'confidence_threshold',
        'language',
        'updated_by',
    ];

    protected $casts = [
        'temperature' => 'float',
        'max_tokens' => 'integer',
        'stream_timeout_seconds' => 'integer',
        'chunk_size' => 'integer',
        'chunk_overlap' => 'integer',
        'rag_top_n' => 'integer',
        'confidence_threshold' => 'float',
        'api_key' => Encryptable::class,
        'embedding_api_key' => Encryptable::class,
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'updated_by');
    }

    public static function current(): self
    {
        $key = 'ai_settings.current';

        // Cache guarda atributos brutos, não o modelo: com o hardening do
        // Laravel (unserialize com allowed_classes=false) modelo serializado
        // volta como __PHP_Incomplete_Class. Bruto também mantém a api_key
        // cifrada no cache — o cast descriptografa só no acesso.
        if (is_array($cached = cache()->get($key))) {
            // setRawAttributes pula os casts no set: re-aplicá-los duplicaria
            // o encode (array) e re-criptografaria (Encryptable) os valores
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
                    'provider' => 'openai',
                    'endpoint' => 'https://api.openai.com/v1',
                    'model' => 'gpt-4o',
                    'embedding_model' => 'text-embedding-3-small',
                ]);
            } catch (\Throwable) {
                // Role RLS sem INSERT em ai_settings — defaults em memória
                $settings = (new static)->forceFill([
                    'provider' => 'openai',
                    'endpoint' => 'https://api.openai.com/v1',
                    'model' => 'gpt-4o',
                    'embedding_model' => 'text-embedding-3-small',
                ]);
            }
        }

        cache()->put($key, $settings->getAttributes(), now()->addMinutes(5));

        return $settings;
    }

    public static function clearCache(): void
    {
        cache()->forget('ai_settings.current');
    }
}
