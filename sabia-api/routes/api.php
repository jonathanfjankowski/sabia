<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\WidgetChatController;
use App\Http\Controllers\Api\SearchController;

use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\Admin\SettingsController;
use App\Http\Controllers\Api\Admin\AuditLogController;
use App\Http\Controllers\Api\Admin\SystemLogController;
use App\Http\Controllers\Api\Admin\KnowledgeGapController;
use App\Http\Controllers\Api\Admin\RatingController;
use App\Http\Controllers\Api\Admin\WidgetConversationController;
use App\Http\Controllers\Api\Admin\HealthController;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Sabiá v3.0
|--------------------------------------------------------------------------
*/

// ==================== Rotas Públicas ====================
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,15');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,15');

// ==================== Rotas do Widget (Públicas) ====================
Route::get('/widget/config', [WidgetChatController::class, 'config'])->middleware('widget.origin');
Route::post('/widget/chat', [WidgetChatController::class, 'chat'])->middleware(['widget.origin', 'throttle:30,60']);

// ==================== Rotas Protegidas (Autenticado) ====================
Route::middleware(['auth:sanctum', 'rls.context', 'throttle:200,60'])->group(function () {
    // --- Auth ---
    Route::get('/user', fn(Request $r) => $r->user()->load('profile'));
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // --- Conversas ---
    Route::apiResource('conversations', ConversationController::class);
    Route::post('/conversations/{id}/messages', [MessageController::class, 'send'])->middleware('throttle:100,60');
    Route::get('/messages/{id}/stream', [MessageController::class, 'stream']);
    Route::post('/conversations/{conversation}/close', [MessageController::class, 'close']);
    Route::post('/conversations/{conversation}/transfer', [MessageController::class, 'transfer']);
    Route::get('/conversations/{id}/export', [ConversationController::class, 'export']);

    // --- Chat IA ---
    Route::post('/chat', [ChatController::class, 'send'])->middleware('throttle:100,60');
    Route::get('/chat/history', [ChatController::class, 'history']);
    Route::post('/chat/{conversation}/close', [ChatController::class, 'close']);

    // --- Documentos (TipTap Editor) ---
    Route::apiResource('documents', DocumentController::class)->middleware('throttle:20,60');
    Route::post('/documents/{id}/ai-action', [DocumentController::class, 'aiAction']);

    // --- Base de Conhecimento ---
    Route::get('/articles', [ArticleController::class, 'index']);
    Route::get('/articles/{article:slug}', [ArticleController::class, 'show']);
    Route::get('/articles/{article}/related', [ArticleController::class, 'related']);
    Route::post('/articles/{article}/feedback', [ArticleController::class, 'feedback']);

    // --- Categorias ---
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);

    // --- Busca Híbrida ---
    Route::get('/search', [SearchController::class, 'search']);
});

// ==================== Rotas Admin (Gestor) ====================
Route::middleware(['auth:sanctum', 'rls.context', 'role:gestor'])->prefix('admin')->group(function () {
    Route::apiResource('users', UserController::class);

    // Artigos
    Route::apiResource('articles', ArticleController::class);
    Route::post('/articles/{article}/restore', [ArticleController::class, 'restore']);
    Route::get('/articles/{article}/versions', [ArticleController::class, 'versions']);
    Route::post('/articles/{article}/revert/{version}', [ArticleController::class, 'revert']);
    Route::post('/articles/preview-import', [ArticleController::class, 'previewImport']);

    // Categorias
    Route::apiResource('categories', CategoryController::class)->except(['index', 'show']);

    // Configurações
    Route::get('/settings/ai', [SettingsController::class, 'getAiSettings']);
    Route::put('/settings/ai', [SettingsController::class, 'updateAiSettings']);
    Route::post('/settings/ai/test-prompt', [SettingsController::class, 'testPrompt']);
    Route::get('/settings/company', [SettingsController::class, 'getCompanySettings']);
    Route::put('/settings/company', [SettingsController::class, 'updateCompanySettings']);
    Route::get('/settings/widget', [SettingsController::class, 'getWidgetSettings']);
    Route::put('/settings/widget', [SettingsController::class, 'updateWidgetSettings']);

    // Logs
    Route::get('/audit-logs', [AuditLogController::class, 'index']);
    Route::get('/system-logs', [SystemLogController::class, 'index']);
    Route::get('/system-logs/{systemLog}', [SystemLogController::class, 'show']);

    // Knowledge Gaps
    Route::get('/knowledge-gaps', [KnowledgeGapController::class, 'index']);
    Route::put('/knowledge-gaps/{knowledgeGap}/resolve', [KnowledgeGapController::class, 'resolve']);
    Route::delete('/knowledge-gaps/{knowledgeGap}', [KnowledgeGapController::class, 'destroy']);

    // Avaliações
    Route::get('/ratings', [RatingController::class, 'index']);

    // Chats do Widget
    Route::get('/widget-conversations', [WidgetConversationController::class, 'index']);
    Route::get('/widget-conversations/{conversation}', [WidgetConversationController::class, 'show']);
    Route::get('/widget-conversations/{conversation}/export', [WidgetConversationController::class, 'export']);

    // Saúde
    Route::get('/health', [HealthController::class, 'index']);
});
