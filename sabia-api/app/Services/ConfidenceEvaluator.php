<?php

namespace App\Services;

class ConfidenceEvaluator
{
    /**
     * Threshold padrão para confiança alta
     */
    private float $highThreshold = 0.75;

    /**
     * Threshold para confiança baixa
     */
    private float $lowThreshold = 0.45;

    /**
     * Avalia nível de confiança baseado nos chunks encontrados
     *
     * @param array $chunks Chunks com scores de similaridade
     * @param float|null $threshold Threshold customizado
     * @return array { level: string, top_score: float, message: string|null }
     */
    public function evaluate(array $chunks, ?float $threshold = null): array
    {
        $threshold = $threshold ?? $this->highThreshold;

        if (empty($chunks)) {
            return [
                'level' => 'none',
                'top_score' => 0,
                'message' => 'Nenhum conteúdo encontrado na base de conhecimento.',
            ];
        }

        $topScore = $chunks[0]['similarity'] ?? 0;

        if ($topScore >= $threshold) {
            return [
                'level' => 'high',
                'top_score' => $topScore,
                'message' => null,
            ];
        }

        if ($topScore >= ($threshold * 0.6)) {
            return [
                'level' => 'low',
                'top_score' => $topScore,
                'message' => 'Não tenho total certeza sobre esta resposta. Recomendo verificar com o suporte para confirmar.',
            ];
        }

        return [
            'level' => 'none',
            'top_score' => $topScore,
            'message' => 'Não encontrei informações suficientes para responder sua pergunta.',
        ];
    }

    /**
     * Verifica se deve responder baseado no nível de confiança
     */
    public function shouldRespond(string $level): bool
    {
        return in_array($level, ['high', 'low']);
    }

    /**
     * Obtém o level de confiança como score numérico
     */
    public function getScore(string $level): float
    {
        return match ($level) {
            'high' => 1.0,
            'low' => 0.5,
            'none' => 0.0,
            default => 0.0,
        };
    }

    public function setHighThreshold(float $threshold): void
    {
        $this->highThreshold = max(0, min(1, $threshold));
    }

    public function setLowThreshold(float $threshold): void
    {
        $this->lowThreshold = max(0, min($this->highThreshold, $threshold));
    }
}
