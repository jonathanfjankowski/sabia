<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class ScopeGuardService
{
    /**
     * Lista de tópicos permitidos (relacionados ao Bsoft TMS)
     */
    private array $allowedTopics = [
        'tms', 'nota fiscal', 'notas fiscais', 'nfe', 'nf-e', 'cte', 'ct-e', 'mdfe', 'mdf-e',
        'bsoft', 'sistema', 'software', 'emissão', 'fiscal', 'transportadora', 'frete',
        'conhecimento', 'manifesto', 'documento fiscal', 'danfe', 'dancte',
        'cancelamento', 'inutilização', 'carta correção', 'cce',
        'cadastro', 'cliente', 'fornecedor', 'transportador', 'motorista', 'veículo',
        'relatório', 'dashboard', 'gráfico', 'indicador', 'desempenho',
        'xml', 'danfe', 'sefaz', 'autorização', 'protocolo', 'recibo',
        'homologação', 'produção', 'certificado digital', 'a3', 'a1',
        'usuário', 'senha', 'permissão', 'perfil', 'acesso',
        'suporte', 'ajuda', 'tutorial', 'manual', 'guia', 'como fazer',
    ];

    /**
     * Verifica se a pergunta está dentro do escopo permitido
     *
     * @param string $question
     * @return array { is_allowed: bool, reason: string|null, matched_topics: array }
     */
    public function check(string $question): array
    {
        $questionLower = mb_strtolower($question);
        $matchedTopics = [];

        foreach ($this->allowedTopics as $topic) {
            if (mb_strpos($questionLower, $topic) !== false) {
                $matchedTopics[] = $topic;
            }
        }

        // Se encontrou tópicos permitidos, está no escopo
        if (count($matchedTopics) > 0) {
            return [
                'is_allowed' => true,
                'reason' => null,
                'matched_topics' => $matchedTopics,
            ];
        }

        // Verificar se é uma saudação/pergunta genérica
        $greetings = ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'obrigado'];
        foreach ($greetings as $greeting) {
            if (mb_strpos($questionLower, $greeting) !== false) {
                return [
                    'is_allowed' => true,
                    'reason' => null,
                    'matched_topics' => ['greeting'],
                ];
            }
        }

        return [
            'is_allowed' => false,
            'reason' => 'Sou especializado em responder perguntas sobre o sistema Bsoft TMS. Posso ajudar com dúvidas sobre notas fiscais, emissão, cadastros, relatórios e outros tópicos relacionados ao sistema.',
            'matched_topics' => [],
        ];
    }

    /**
     * Registra tentativa de pergunta fora do escopo
     */
    public function logOutOfScope(string $question, ?int $userId = null): void
    {
        Log::info('Pergunta fora do escopo', [
            'user_id' => $userId,
            'question_preview' => mb_substr($question, 0, 200),
        ]);
    }

    /**
     * Adiciona tópicos permitidos em runtime
     */
    public function addAllowedTopics(array $topics): void
    {
        $this->allowedTopics = array_merge($this->allowedTopics, $topics);
    }
}
