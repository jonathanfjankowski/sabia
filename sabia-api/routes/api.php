<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\MessageController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Conversations
    Route::apiResource('conversations', ConversationController::class);
    Route::post('/conversations/{id}/messages', [MessageController::class, 'send']);
    Route::get('/messages/{id}/stream', [MessageController::class, 'stream']);

    // Documents
    Route::apiResource('documents', DocumentController::class);
    Route::post('/documents/{id}/ai-action', [DocumentController::class, 'aiAction']);
});
