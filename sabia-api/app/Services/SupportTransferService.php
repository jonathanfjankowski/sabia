<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\WidgetSettings;
use App\Services\Teams\TeamsNotificationService;
use Carbon\Carbon;

class SupportTransferService
{
    public function __construct(
        private TeamsNotificationService $teams = new TeamsNotificationService,
    ) {}

    public function tryTransfer(Conversation $conversation): array
    {
        $settings = WidgetSettings::current();
        $result = [
            'transferred' => false,
            'reason' => null,
            'linkOpened' => false,
        ];

        // 1) Verifica modo manutenção
        if ($settings->maintenance_mode) {
            $result['reason'] = 'maintenance';
            $this->notifyTeamsIfEnabled($settings, 'maintenance', $conversation);

            return $result;
        }

        // 2) Verifica horário de suporte
        $now = Carbon::now();
        $start = $this->parseSupportTime($settings->support_start_time);
        $end = $this->parseSupportTime($settings->support_end_time);

        if ($start && $end && ! $this->isWithinHours($now, $start, $end)) {
            $result['reason'] = 'out_of_hours';
            $this->notifyTeamsIfEnabled($settings, 'out_of_hours', $conversation);

            return $result;
        }

        // 3) Gera resumo via IA (best-effort, não-bloqueante)
        $summary = $this->generateSummary($conversation);

        // 4) Fecha e marca como transferida
        $conversation->update([
            'is_closed' => true,
            'closed_at' => now(),
            'transfer_status' => 'transferred',
        ]);

        // 5) Constrói link de suporte com placeholders substituídos
        $link = $this->buildSupportLink($settings, $conversation);

        // 6) Notifica Teams
        $this->teams->sendTransfer(
            (string) $conversation->id,
            $conversation->user_name ?? 'Anônimo',
            $summary
        );

        $result['transferred'] = true;
        $result['link'] = $link;
        $result['summary'] = $summary;

        return $result;
    }

    public function isWithinHours(Carbon $now, Carbon $start, Carbon $end): bool
    {
        $current = $now->format('H:i');
        if ($start->lt($end)) {
            return $current >= $start->format('H:i') && $current <= $end->format('H:i');
        }

        // Overnight range (e.g. 22:00–06:00)
        return $current >= $start->format('H:i') || $current <= $end->format('H:i');
    }

    /**
     * A coluna é TIME no Postgres e chega como 'H:i:s' (ou 'H:i' em outros
     * drivers) — createFromFormat('H:i', ...) estourava InvalidFormatException.
     * Horário ausente/ilegível = sem restrição de horário.
     */
    private function parseSupportTime(?string $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        foreach (['H:i:s', 'H:i', 'G:i'] as $format) {
            try {
                $parsed = Carbon::createFromFormat($format, $value);

                if ($parsed !== false) {
                    return $parsed;
                }
            } catch (\Throwable) {
                continue;
            }
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function buildSupportLink(WidgetSettings $settings, Conversation $conversation): ?string
    {
        $link = $settings->support_link;
        if (! $link) {
            return null;
        }

        $name = $conversation->user_name ?? '';
        $email = $conversation->user?->email ?? '';

        return str_replace(
            ['{NOME}', '{EMAIL}'],
            [urlencode($name), urlencode($email)],
            $link
        );
    }

    private function generateSummary(Conversation $conversation): string
    {
        // Últimas 20 mensagens (ASC + limit pegaria as 20 mais antigas)
        $messages = Message::where('conversation_id', $conversation->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->reverse();

        if ($messages->isEmpty()) {
            return 'Sem mensagens na conversa.';
        }

        // Concatena últimas mensagens do usuário como resumo (best-effort, sem chamada de IA para não bloquear)
        $userMessages = $messages->where('role', 'user')->pluck('content')->toArray();
        $text = implode(' | ', array_slice($userMessages, -5));

        return mb_substr($text, 0, 300);
    }

    private function notifyTeamsIfEnabled(WidgetSettings $settings, string $type, Conversation $conversation): void
    {
        $enabled = match ($type) {
            'out_of_hours' => $settings->teams_notify_out_of_hours,
            'maintenance' => true,
            default => true,
        };

        if (! $enabled) {
            return;
        }

        $message = $conversation->messages()->latest()->first()?->content ?? '';
        $userName = $conversation->user_name ?? 'Anônimo';

        // Mapeamento explícito: concatenação dinâmica com ucfirst gerava
        // nomes inexistentes ("sendOut_of_hours") e fatal error no transfer
        match ($type) {
            'out_of_hours' => $this->teams->sendOutOfHours($userName, $message),
            'maintenance' => $this->teams->sendMaintenance($userName, $message),
            default => $this->teams->sendError($type, $message),
        };
    }
}
