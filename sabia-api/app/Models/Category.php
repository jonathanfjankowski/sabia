<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Model de Categoria para organização de artigos
 */
class Category extends Model
{
    use HasFactory;

    /**
     * Atributos que podem ser preenchidos em massa.
     */
    protected $fillable = [
        'name',
        'slug',
        'description',
        'parent_id',
        'order',
        'active',
    ];

    /**
     * Conversões de atributos.
     */
    protected $casts = [
        'active' => 'boolean',
    ];

    /**
     * Boot do model - gera slug automaticamente.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($category) {
            if (empty($category->slug)) {
                $category->slug = Str::slug($category->name);
            }
        });
    }

    /**
     * Relacionamento com categoria pai.
     */
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    /**
     * Relacionamento com subcategorias.
     */
    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    /**
     * Relacionamento com artigos.
     */
    public function articles()
    {
        return $this->hasMany(KnowledgeBaseArticle::class);
    }

    /**
     * Escopo para categorias ativas.
     */
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Escopo para ordenação.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('order')->orderBy('name');
    }

    /**
     * Obtém todas as subcategorias recursivamente.
     */
    public function getAllChildren(): array
    {
        $children = [];
        
        foreach ($this->children as $child) {
            $children[] = $child;
            $children = array_merge($children, $child->getAllChildren());
        }
        
        return $children;
    }

    /**
     * Conta artigos nesta categoria e subcategorias.
     */
    public function countArticlesWithChildren(): int
    {
        $count = $this->articles()->published()->count();
        
        foreach ($this->children as $child) {
            $count += $child->countArticlesWithChildren();
        }
        
        return $count;
    }
}
