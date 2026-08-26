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
        'embedding_model',
        'temperature',
        'max_tokens',
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
        'chunk_size' => 'integer',
        'chunk_overlap' => 'integer',
        'rag_top_n' => 'integer',
        'confidence_threshold' => 'float',
        'api_key' => Encryptable::class,
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'updated_by');
    }

    public static function current(): self
    {
        return static::first() ?? static::create([
            'provider' => 'openai',
            'endpoint' => 'https://api.openai.com/v1',
            'model' => 'gpt-4o',
            'embedding_model' => 'text-embedding-3-small',
        ]);
    }
}
