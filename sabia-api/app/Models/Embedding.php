<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Model de Embedding para busca semântica
 * 
 * Armazena vetores gerados por modelos de embedding
 * para busca por similaridade usando pgvector.
 */
class Embedding extends Model
{
    use HasFactory;

    /**
     * Atributos que podem ser preenchidos em massa.
     */
    protected $fillable = [
        'embeddable_type',
        'embeddable_id',
        'model',
        'embedding',
        'chunk_text',
        'chunk_index',
    ];

    /**
     * Conversões de atributos.
     * 
     * O embedding é convertido automaticamente para array
     * graças ao tipo vector do PostgreSQL.
     */
    protected $casts = [
        'embedding' => 'array',
        'chunk_index' => 'integer',
    ];

    /**
     * Relacionamento polimórfico com o modelo original.
     */
    public function embeddable()
    {
        return $this->morphTo();
    }

    /**
     * Escopo para buscar embeddings similares.
     * 
     * @param mixed $query Builder da query
     * @param array $vector Vetor de busca (array de floats)
     * @param int $limit Limite de resultados
     * @return mixed
     */
    public function scopeSimilar($query, array $vector, int $limit = 5)
    {
        // Converte array para formato do pgvector
        $vectorString = '[' . implode(',', $vector) . ']';
        
        return $query
            ->select(['*', \DB::raw("embedding <=> '{$vectorString}'::vector AS similarity"))
            ->orderBy('similarity')
            ->limit($limit);
    }

    /**
     * Busca embeddings similares ao texto fornecido.
     * 
     * Este método requer que um embedding seja gerado para o texto
     * antes da busca.
     */
    public static function searchSimilar(string $text, int $limit = 5): array
    {
        // Aqui seria chamado o serviço de embedding para gerar o vetor
        // Por enquanto, retorna vazio - será implementado no serviço
        return [];
    }

    /**
     * Verifica se o embedding já existe para este chunk.
     */
    public static function existsForChunk(string $model, string $chunkText): bool
    {
        return self::where('model', $model)
            ->where('chunk_text', $chunkText)
            ->exists();
    }

    /**
     * Deleta embeddings antigos para um modelo.
     */
    public static function deleteOldForModel(string $model): int
    {
        return self::where('model', $model)->delete();
    }
}
