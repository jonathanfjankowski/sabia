<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\WidgetChatController;

use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\Admin\SettingsController;
use App\Http\Controllers\Api\Admin\AuditLogController;
use App\Http\Controllers\Api\Admin\KnowledgeGapController;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Sabiá v3.0
|--------------------------------------------------------------------------
|
| Rotas públicas e protegidas para o sistema de chatbot com IA.
|
*/

// ==================== Rotas Públicas ====================
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// ==================== Rotas Protegidas (Autenticado) ====================
Route::middleware('auth:sanctum')->group(function () {
    // --- Auth ---
    Route::get('/user', function (Request $request) {
        return $request->user()->load('profile');
    });
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // --- Conversas ---
    Route::apiResource('conversations', ConversationController::class);
    Route::post('/conversations/{id}/messages', [MessageController::class, 'send']);
    Route::get('/messages/{id}/stream', [MessageController::class, 'stream']);
    Route::post('/conversations/{conversation}/close', [MessageController::class, 'close']);
    Route::post('/conversations/{conversation}/transfer', [MessageController::class, 'transfer']);

    // --- Chat IA ---
    Route::post('/chat', [ChatController::class, 'send']);
    Route::get('/chat/history', [ChatController::class, 'history']);
    Route::post('/chat/{conversation}/close', [ChatController::class, 'close']);

    // --- Documentos (TipTap Editor) ---
    Route::apiResource('documents', DocumentController::class);
    Route::post('/documents/{id}/ai-action', [DocumentController::class, 'aiAction']);

    // --- Base de Conhecimento ---
    Route::get('/articles', [ArticleController::class, 'index']);        Route::get('/articles/{article:slug}', [ArticleController::class, 'show']);
    Route::get('/articles/{article}/related', [ArticleController::class, 'related']);
    Route::post('/articles/{article}/feedback', [ArticleController::class, 'feedback']);

    // --- Categorias ---
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);
});

// ==================== Rotas Admin (Gestor) ====================
// ==================== Rotas do Widget (Públicas) ====================
Route::get('/widget/config', [WidgetChatController::class, 'config']);
Route::post('/widget/chat', [WidgetChatController::class, 'chat'])->middleware('widget.origin');

// ==================== Rotas Admin (Gestor) ====================
Route::middleware(['auth:sanctum', 'role:gestor'])->prefix('admin')->group(function () {
    // Usuários
    Route::apiResource('users', UserController::class);

    // Artigos (CRUD completo + versionamento)
    Route::apiResource('articles', ArticleController::class);
    Route::post('/articles/{article}/restore', [ArticleController::class, 'restore']);
    Route::get('/articles/{article}/versions', [ArticleController::class, 'versions']);
    Route::post('/articles/{article}/revert/{version}', [ArticleController::class, 'revert']);
    Route::post('/articles/preview-import', [ArticleController::class, 'previewImport']);

    // Categorias (CRUD completo)
    Route::apiResource('categories', CategoryController::class)->except(['index', 'show']);

    // Configurações
    Route::get('/settings/ai', [SettingsController::class, 'getAiSettings']);
    Route::put('/settings/ai', [SettingsController::class, 'updateAiSettings']);
    Route::post('/settings/ai/test-prompt', [SettingsController::class, 'testPrompt']);
    Route::get('/settings/company', [SettingsController::class, 'getCompanySettings']);
    Route::put('/settings/company', [SettingsController::class, 'updateCompanySettings']);

    // Logs
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // Knowledge Gaps
    Route::get('/knowledge-gaps', [KnowledgeGapController::class, 'index']);
    Route::put('/knowledge-gaps/{knowledgeGap}/resolve', [KnowledgeGapController::class, 'resolve']);
    Route::delete('/knowledge-gaps/{knowledgeGap}', [KnowledgeGapController::class, 'destroy']);
});
