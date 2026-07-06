<?php

namespace App\Services;

use App\Models\Article;
use App\Models\ArticleChunk;

class ArticleChunkService
{
    /**
     * Tamanho padrão de cada chunk em caracteres
     */
    protected int $chunkSize = 500;

    /**
     * Sobreposição entre chunks em caracteres
     */
    protected int $chunkOverlap = 100;

    /**
     * Processar artigo: dividir em chunks e salvar
     */
    public function processArticle(Article $article): void
    {
        // Remover chunks antigos
        $article->chunks()->delete();

        $chunks = $this->splitIntoChunks($article->content);

        foreach ($chunks as $index => $chunkText) {
            $keywords = $this->extractKeywords($chunkText);

            ArticleChunk::create([
                'article_id' => $article->id,
                'content' => $chunkText,
                'chunk_index' => $index,
                'keywords' => $keywords,
            ]);
        }
    }

    /**
     * Dividir texto em chunks com sobreposição
     */
    public function splitIntoChunks(string $text): array
    {
        // Remover markdown formatting para split mais limpo
        $cleanText = strip_tags($text);
        $cleanText = preg_replace('/#{1,6}\s+/', '', $cleanText);
        $cleanText = preg_replace('/[*_~`]/', '', $cleanText);

        $length = mb_strlen($cleanText);

        if ($length <= $this->chunkSize) {
            return [trim($cleanText)];
        }

        $chunks = [];
        $start = 0;

        while ($start < $length) {
            $end = $start + $this->chunkSize;

            if ($end >= $length) {
                $chunks[] = trim(mb_substr($cleanText, $start));
                break;
            }

            // Tentar quebrar em final de frase ou parágrafo
            $segment = mb_substr($cleanText, $start, $this->chunkSize);
            $breakPoint = $this->findBreakPoint($segment);

            $chunks[] = trim(mb_substr($cleanText, $start, $breakPoint));
            $start = $start + $breakPoint - $this->chunkOverlap;
        }

        return $chunks;
    }

    /**
     * Encontrar melhor ponto de quebra (final de frase ou parágrafo)
     */
    protected function findBreakPoint(string $text): int
    {
        $length = mb_strlen($text);

        // Procurar por quebras de parágrafo primeiro
        $paraBreak = mb_strrpos($text, "\n\n");
        if ($paraBreak !== false && $paraBreak > $length * 0.5) {
            return $paraBreak;
        }

        // Procurar por final de frase
        foreach (['. ', '! ', '? ', '.\n', '!\n', '?\n'] as $delimiter) {
            $pos = mb_strrpos($text, $delimiter);
            if ($pos !== false && $pos > $length * 0.5) {
                return $pos + mb_strlen($delimiter);
            }
        }

        // Procurar por vírgula ou ponto e vírgula
        $commaBreak = mb_strrpos($text, ', ');
        if ($commaBreak !== false && $commaBreak > $length * 0.5) {
            return $commaBreak + 2;
        }

        // Procurar por espaço
        $spaceBreak = mb_strrpos($text, ' ');
        if ($spaceBreak !== false) {
            return $spaceBreak + 1;
        }

        return $length;
    }

    /**
     * Extrair palavras-chave de um texto
     */
    public function extractKeywords(string $text): array
    {
        // Palavras comuns em português para ignorar
        $stopWords = [
            'a', 'ao', 'aos', 'aquela', 'aquelas', 'aquele', 'aqueles',
            'com', 'como', 'da', 'das', 'de', 'dela', 'delas', 'dele', 'deles',
            'do', 'dos', 'e', 'em', 'entre', 'era', 'eram', 'essa', 'essas',
            'esse', 'esses', 'esta', 'estas', 'este', 'estes', 'eu',
            'foi', 'foram', 'há', 'isso', 'isto', 'já', 'lhe', 'lhes',
            'mais', 'mas', 'me', 'mesmo', 'na', 'nas', 'no', 'nos',
            'nossa', 'nossas', 'nosso', 'nossos', 'num', 'numa', 'o', 'os',
            'ou', 'para', 'pela', 'pelas', 'pelo', 'pelos', 'por', 'qual',
            'quando', 'que', 'quem', 'se', 'seja', 'sem', 'seu', 'seus',
            'sua', 'suas', 'só', 'sobre', 'te', 'tem', 'têm', 'teu', 'teus',
            'tua', 'tuas', 'um', 'uma', 'umas', 'uns', 'é', 'estão',
        ];

        // Extrair palavras com mais de 3 caracteres
        $words = str_word_count(mb_strtolower($text), 1, 'àáâãäåèéêëìíîïòóôõöùúûüçñ');
        $words = array_filter($words, function ($word) use ($stopWords) {
            return mb_strlen($word) > 3 && !in_array($word, $stopWords);
        });

        // Contar frequência e pegar as top 10
        $frequencies = array_count_values($words);
        arsort($frequencies);

        return array_slice(array_keys($frequencies), 0, 10);
    }

    public function setChunkSize(int $size): void
    {
        $this->chunkSize = max(100, min(2000, $size));
    }

    public function setChunkOverlap(int $overlap): void
    {
        $this->chunkOverlap = max(0, min($this->chunkSize - 1, $overlap));
    }
}
