<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Model de Log de Auditoria
 * 
 * Registra todas as ações importantes no sistema para rastreabilidade.
 */
class AuditLog extends Model
{
    use HasFactory;

    /**
     * Ações comuns de auditoria
     */
    const ACTION_CREATE = 'create';
    const ACTION_UPDATE = 'update';
    const ACTION_DELETE = 'delete';
    const ACTION_LOGIN = 'login';
    const ACTION_LOGOUT = 'logout';
    const ACTION_VIEW = 'view';

    /**
     * Atributos que podem ser preenchidos em massa.
     */
    protected $fillable = [
        'user_id',
        'action',
        'model_type',
        'model_id',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
    ];

    /**
     * Conversões de atributos.
     */
    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    /**
     * Relacionamento com usuário.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relacionamento polimórfico com o modelo afetado.
     */
    public function model()
    {
        return $this->morphTo();
    }

    /**
     * Escopo para filtrar por ação.
     */
    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Escopo para filtrar por modelo.
     */
    public function scopeForModel($query, string $modelType, ?int $modelId = null)
    {
        $query = $query->where('model_type', $modelType);
        
        if ($modelId !== null) {
            $query = $query->where('model_id', $modelId);
        }
        
        return $query;
    }

    /**
     * Escopo para filtrar por usuário.
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Escopo para logs recentes.
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Registra uma ação de forma conveniente.
     */
    public static function log(
        string $action,
        ?Model $model = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?int $userId = null
    ): self {
        return self::create([
            'user_id' => $userId ?? auth()->id(),
            'action' => $action,
            'model_type' => $model ? get_class($model) : null,
            'model_id' => $model ? $model->id : null,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Retorna descrição legível da ação.
     */
    public function getDescription(): string
    {
        $modelName = $this->model_type ? class_basename($this->model_type) : 'Recurso';
        
        return match($this->action) {
            self::ACTION_CREATE => "Criou {$modelName}",
            self::ACTION_UPDATE => "Atualizou {$modelName}",
            self::ACTION_DELETE => "Excluiu {$modelName}",
            self::ACTION_LOGIN => "Realizou login",
            self::ACTION_LOGOUT => "Realizou logout",
            self::ACTION_VIEW => "Visualizou {$modelName}",
            default => ucfirst($this->action),
        };
    }
}
