<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\SystemLog;
use Illuminate\Support\Facades\Request;

class AuditService
{
    public static function record(
        string $action,
        ?string $entityType = null,
        ?string $entityId = null,
        mixed $oldValue = null,
        mixed $newValue = null
    ): void {
        AuditLog::create([
            'user_id'     => auth()->id(),
            'action'      => $action,
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'old_values'  => $oldValue ? json_encode($oldValue) : null,
            'new_values'  => $newValue ? json_encode($newValue) : null,
            'ip_address'  => Request::ip(),
            'user_agent'  => Request::userAgent(),
        ]);
    }

    public static function articleCreated($article): void
    {
        self::record('create', 'Article', (string) $article->id, null, ['title' => $article->title]);
    }

    public static function articleUpdated($article, $changes): void
    {
        self::record('update', 'Article', (string) $article->id, $changes['old'] ?? null, $changes['new'] ?? null);
    }

    public static function articleArchived($article): void
    {
        self::record('archive', 'Article', (string) $article->id, ['title' => $article->title], null);
    }

    public static function articleRestored($article): void
    {
        self::record('restore', 'Article', (string) $article->id, null, ['title' => $article->title]);
    }

    public static function articleReverted($article, int $version): void
    {
        self::record('revert', 'Article', (string) $article->id, null, ['version' => $version]);
    }

    public static function userCreated($user): void
    {
        self::record('create', 'User', (string) $user->id, null, ['name' => $user->name, 'email' => $user->email]);
    }

    public static function userUpdated($user, $changes): void
    {
        self::record('update', 'User', (string) $user->id, $changes['old'] ?? null, $changes['new'] ?? null);
    }

    public static function userDeactivated($user): void
    {
        self::record('deactivate', 'User', (string) $user->id, ['name' => $user->name], null);
    }

    public static function categoryCreated($category): void
    {
        self::record('create', 'Category', (string) $category->id, null, ['name' => $category->name]);
    }

    public static function categoryUpdated($category): void
    {
        self::record('update', 'Category', (string) $category->id);
    }

    public static function categoryDeleted($category): void
    {
        self::record('delete', 'Category', (string) $category->id, ['name' => $category->name], null);
    }

    public static function aiSettingsChanged($settings): void
    {
        self::record('update', 'AiSettings', (string) $settings->id, null, ['provider' => $settings->provider]);
    }

    public static function widgetSettingsChanged($settings): void
    {
        self::record('update', 'WidgetSettings', (string) $settings->id);
    }

    public static function brandSettingsChanged($settings): void
    {
        self::record('update', 'BrandSettings', (string) $settings->id);
    }

    public static function maintenanceToggled(bool $active): void
    {
        self::record('maintenance_toggle', 'System', null, null, ['maintenance' => $active]);
    }

    public static function knowledgeGapResolved($gap): void
    {
        self::record('resolve', 'KnowledgeGap', (string) $gap->id);
    }

    public static function loginAttempt(string $email, bool $success): void
    {
        self::record($success ? 'login' : 'login_failed', 'Auth', null, ['email' => $email], ['success' => $success]);
    }
}
