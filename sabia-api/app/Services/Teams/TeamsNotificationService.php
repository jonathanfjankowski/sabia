<?php

namespace App\Services\Teams;

use App\Models\WidgetSettings;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TeamsNotificationService
{
    private ?string $webhookUrl;

    public function __construct()
    {
        $this->webhookUrl = WidgetSettings::current()?->teams_webhook_url;
    }

    public function sendTransfer(string $conversationId, string $userName, ?string $summary = null): bool
    {
        return $this->send('transfer', [
            'title' => '🔄 Transferência de Atendimento',
            'text' => $summary
                ? "Conversa **{$conversationId}** transferida por {$userName}.\n\nResumo: {$summary}"
                : "Conversa **{$conversationId}** transferida por {$userName}. Nenhum resumo gerado.",
        ]);
    }

    public function sendKnowledgeGap(string $question, string $source): bool
    {
        return $this->send('knowledge_gap', [
            'title' => '📚 Lacuna de Conhecimento Detectada',
            'text' => "Fonte: **{$source}**\n\nPergunta: {$question}",
        ]);
    }

    public function sendOutOfHours(string $userName, string $message): bool
    {
        return $this->send('out_of_hours', [
            'title' => '🌙 Atendimento Fora do Horário',
            'text' => "Usuário **{$userName}** tentou contato fora do horário.\n\nMensagem: {$message}",
        ]);
    }

    public function sendError(string $context, string $error): bool
    {
        return $this->send('error', [
            'title' => '🚨 Erro Crítico no Sabiá',
            'text' => "Contexto: **{$context}**\n\nErro: {$error}",
        ]);
    }

    private function send(string $type, array $payload): bool
    {
        if (! $this->webhookUrl) {
            return false;
        }

        try {
            $card = [
                '@type' => 'MessageCard',
                '@context' => 'https://schema.org/extensions',
                'summary' => $payload['title'],
                'themeColor' => $type === 'error' ? 'FF0000' : ($type === 'transfer' ? '0076D7' : 'FFA500'),
                'sections' => [
                    [
                        'activityTitle' => $payload['title'],
                        'activityText' => $payload['text'],
                        'markdown' => true,
                    ],
                ],
            ];

            $response = $this->client()->post($this->webhookUrl, $card);

            return $response->successful();
        } catch (\Throwable $e) {
            Log::warning('Teams webhook failed', [
                'type' => $type,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function client(): PendingRequest
    {
        return Http::timeout(10)
            ->withHeaders(['Content-Type' => 'application/json']);
    }
}
