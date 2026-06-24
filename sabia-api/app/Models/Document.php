<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'content_json',
        'word_count',
    ];

    protected $casts = [
        'content_json' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relacionamentos
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Accessors
    public function getContentAttribute()
    {
        return $this->content_json;
    }

    // Métodos utilitários
    public function updateWordCount()
    {
        if (!$this->content_json) {
            $this->word_count = 0;
            return;
        }

        // Extrair texto do conteúdo JSON do TipTap
        $text = $this->extractTextFromJson($this->content_json);
        $this->word_count = str_word_count($text);
    }

    private function extractTextFromJson(array $content): string
    {
        $text = '';
        
        if (isset($content['content'])) {
            foreach ($content['content'] as $node) {
                $text .= $this->extractTextFromNode($node) . ' ';
            }
        }
        
        return trim($text);
    }

    private function extractTextFromNode(array $node): string
    {
        $text = '';
        
        if (isset($node['text'])) {
            $text .= $node['text'];
        }
        
        if (isset($node['content'])) {
            foreach ($node['content'] as $child) {
                $text .= ' ' . $this->extractTextFromNode($child);
            }
        }
        
        return trim($text);
    }
}
