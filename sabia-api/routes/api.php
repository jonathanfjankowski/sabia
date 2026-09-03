<?php

use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\HealthController;
use App\Http\Controllers\Admin\RatingController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\SystemLogController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\WidgetConversationController;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\ArticleSuggestionController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\KnowledgeGapController;
use App\Http\Controllers\PublicWidgetController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ── Public routes (NO auth middleware) ──────────────────────────────────

Route::get('/health', fn () => response()->json(['status' => 'ok']));

// Login — MUST be outside sanctum group
Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:login')
    ->name('login');

// Widget (no sanctum, RLS + origin check)
Route::middleware(['rls:widget', 'widget.origin'])->prefix('widget')->group(function () {
    Route::get('/settings', [PublicWidgetController::class, 'settings']);
    Route::get('/brand', [PublicWidgetController::class, 'brand']);
    Route::post('/chat', [PublicWidgetController::class, 'chat'])->middleware('throttle:widget-chat');
    Route::post('/conversations/{id}/close', [PublicWidgetController::class, 'close']);
    Route::post('/conversations/{id}/transfer', [PublicWidgetController::class, 'transfer']);
});

// ── Authenticated routes ───────────────────────────────────────────────────

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Internal users + gestor: RLS context
    Route::middleware('rls')->group(function () {

        // ── Gestor + Operador: KB + Chat ──────────────────────────────
        Route::middleware('role:gestor,operador')->group(function () {
            // Articles
            Route::get('/articles', [ArticleController::class, 'index']);
            Route::get('/articles/{slug}', [ArticleController::class, 'show']);
            Route::get('/articles/{id}/related', [ArticleController::class, 'related']);
            Route::post('/articles/{id}/feedback', [ArticleController::class, 'feedback']);
            Route::post('/articles/{id}/view', [ArticleController::class, 'view']);

            // Categories (read)
            Route::get('/categories', [CategoryController::class, 'index']);

            // Search
            Route::get('/search', [ArticleController::class, 'search']);

            // Chat (SSE)
            Route::post('/chat', [ChatController::class, 'send'])->middleware('throttle:chat');

            // Conversations
            Route::get('/conversations', [ConversationController::class, 'index']);
            Route::get('/conversations/{id}/messages', [ConversationController::class, 'messages']);
            Route::post('/conversations/{id}/close', [ConversationController::class, 'close']);
            Route::post('/conversations/{id}/transfer', [ConversationController::class, 'transfer']);
            Route::get('/conversations/{id}/export', [ConversationController::class, 'export']);

            // Article Suggestions (operador + gestor)
            Route::get('/article-suggestions', [ArticleSuggestionController::class, 'index']);
            Route::post('/article-suggestions', [ArticleSuggestionController::class, 'store']);
            Route::get('/article-suggestions/{id}', [ArticleSuggestionController::class, 'show']);
            Route::put('/article-suggestions/{id}', [ArticleSuggestionController::class, 'update']);
            Route::post('/article-suggestions/{id}/cancel', [ArticleSuggestionController::class, 'cancel']);
        });

        // ── Gestor only: admin (RLS bypass) ───────────────────────────
        Route::middleware('role:gestor')->prefix('admin')->group(function () {
            // Users (profiles)
            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::put('/users/{id}', [UserController::class, 'update']);
            Route::delete('/users/{id}', [UserController::class, 'destroy']);

            // Articles (all statuses: gestor CRUD)
            Route::get('/articles', [ArticleController::class, 'adminIndex']);
            Route::get('/articles/{id}', [ArticleController::class, 'adminShow']);
            Route::post('/articles', [ArticleController::class, 'adminStore']);
            Route::put('/articles/{id}', [ArticleController::class, 'adminUpdate']);
            Route::delete('/articles/{id}', [ArticleController::class, 'adminDestroy']);
            Route::post('/articles/{id}/restore', [ArticleController::class, 'adminRestore']);
            Route::post('/articles/import', [ArticleController::class, 'import']);
            Route::post('/articles/preview-import', [ArticleController::class, 'previewImport']);
            Route::post('/articles/upload-image', [ArticleController::class, 'uploadImage'])->middleware('throttle:upload');
            Route::get('/articles/{id}/versions', [ArticleController::class, 'versions']);
            Route::post('/articles/{id}/revert/{version}', [ArticleController::class, 'revert']);

            // Categories (gestor full CRUD)
            Route::get('/categories', [CategoryController::class, 'index']);
            Route::post('/categories', [CategoryController::class, 'store']);
            Route::put('/categories/{id}', [CategoryController::class, 'update']);
            Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

            // Knowledge gaps
            Route::get('/knowledge-gaps', [KnowledgeGapController::class, 'index']);
            Route::put('/knowledge-gaps/{id}/resolve', [KnowledgeGapController::class, 'resolve']);

            // Ratings
            Route::get('/ratings', [RatingController::class, 'index']);

            // Widget conversations
            Route::get('/widget-conversations', [WidgetConversationController::class, 'index']);
            Route::get('/widget-conversations/{id}/export', [WidgetConversationController::class, 'export']);

            // Logs
            Route::get('/audit-logs', [AuditLogController::class, 'index']);
            Route::get('/system-logs', [SystemLogController::class, 'index']);

            // Health
            Route::get('/health', [HealthController::class, 'index']);

            // Settings
            Route::get('/settings/ai', [SettingsController::class, 'ai']);
            Route::put('/settings/ai', [SettingsController::class, 'aiUpdate']);
            Route::post('/settings/ai/test-prompt', [SettingsController::class, 'testPrompt']);
            Route::post('/settings/ai/test-embed', [SettingsController::class, 'testEmbed']);
            Route::get('/embedding-sidecar/health', [SettingsController::class, 'sidecarHealth']);
            Route::get('/settings/widget', [SettingsController::class, 'widget']);
            Route::put('/settings/widget', [SettingsController::class, 'widgetUpdate']);
            Route::get('/settings/brand', [SettingsController::class, 'brand']);
            Route::put('/settings/brand', [SettingsController::class, 'brandUpdate']);

            // Article Suggestions (gestor only)
            Route::post('/article-suggestions/{id}/approve', [ArticleSuggestionController::class, 'approve']);
            Route::post('/article-suggestions/{id}/approve-with-edit', [ArticleSuggestionController::class, 'approveWithEdit']);
            Route::post('/article-suggestions/{id}/reject', [ArticleSuggestionController::class, 'reject']);
        });
    });
});
