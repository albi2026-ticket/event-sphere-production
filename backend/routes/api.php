<?php

use App\Http\Controllers\Api\Admin\UserRoleController;
use App\Http\Controllers\Api\AuthUserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\Organizer\OrganizerEventController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [RegisteredUserController::class, 'store'])->middleware('guest');
Route::post('/login', [AuthenticatedSessionController::class, 'store'])->middleware('guest');
Route::post('/forgot-password', [PasswordResetLinkController::class, 'store'])->middleware('guest');
Route::post('/reset-password', [NewPasswordController::class, 'store'])->middleware('guest');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/user', [AuthUserController::class, 'show']);
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy']);

    Route::post('/email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1');

    Route::middleware('role:user,organizer,admin')->group(function (): void {
        Route::get('/me/dashboard', [DashboardController::class, 'user']);
    });

    Route::middleware('role:organizer')->prefix('organizer')->group(function (): void {
        Route::get('/dashboard', [DashboardController::class, 'organizer']);
        Route::get('/events', [OrganizerEventController::class, 'index']);
        Route::get('/events/{event}', [OrganizerEventController::class, 'show']);
    });

    Route::middleware('role:admin')->prefix('admin')->group(function (): void {
        Route::get('/dashboard', [DashboardController::class, 'admin']);
        Route::patch('/users/{user}/role', [UserRoleController::class, 'update']);
        Route::post('/users/{user}/approve-organizer', [UserRoleController::class, 'approveOrganizer']);
        Route::post('/users/{user}/reject-organizer', [UserRoleController::class, 'rejectOrganizer']);
    });
});
