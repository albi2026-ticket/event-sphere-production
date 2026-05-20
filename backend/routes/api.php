<?php

use App\Http\Controllers\Api\Admin\UserRoleController;
use App\Http\Controllers\Api\Admin\AdminEventController;
use App\Http\Controllers\Api\AuthUserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\EventImageController;
use App\Http\Controllers\Api\Organizer\OrganizerEventController;
use App\Http\Controllers\Api\TicketTypeController;
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

Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{event:slug}/images', [EventImageController::class, 'index']);
Route::get('/events/{event:slug}/ticket-types', [TicketTypeController::class, 'index']);
Route::get('/events/{event:slug}', [EventController::class, 'show']);
Route::get('/event-images/{eventImage}', [EventImageController::class, 'show']);
Route::get('/ticket-types/{ticketType}', [TicketTypeController::class, 'show']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/user', [AuthUserController::class, 'show']);
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy']);

    Route::post('/email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1');

    Route::middleware('role:user,organizer,admin')->group(function (): void {
        Route::get('/me/dashboard', [DashboardController::class, 'user']);
        Route::post('/ticket-types/{ticketType}/reserve', [TicketTypeController::class, 'reserve']);
    });

    Route::middleware('role:organizer')->prefix('organizer')->group(function (): void {
        Route::get('/dashboard', [DashboardController::class, 'organizer']);
        Route::get('/events', [OrganizerEventController::class, 'index']);
        Route::post('/events', [OrganizerEventController::class, 'store']);
        Route::get('/events/{event}', [OrganizerEventController::class, 'show']);
        Route::patch('/events/{event}', [OrganizerEventController::class, 'update']);
        Route::delete('/events/{event}', [OrganizerEventController::class, 'destroy']);
        Route::post('/events/{event}/images', [EventImageController::class, 'store']);
        Route::patch('/event-images/{eventImage}', [EventImageController::class, 'update']);
        Route::delete('/event-images/{eventImage}', [EventImageController::class, 'destroy']);
        Route::post('/events/{event}/ticket-types', [TicketTypeController::class, 'store']);
        Route::patch('/ticket-types/{ticketType}', [TicketTypeController::class, 'update']);
        Route::delete('/ticket-types/{ticketType}', [TicketTypeController::class, 'destroy']);
        Route::patch('/ticket-types/{ticketType}/inventory', [TicketTypeController::class, 'adjustInventory']);
    });

    Route::middleware('role:admin')->prefix('admin')->group(function (): void {
        Route::get('/dashboard', [DashboardController::class, 'admin']);
        Route::patch('/users/{user}/role', [UserRoleController::class, 'update']);
        Route::post('/users/{user}/approve-organizer', [UserRoleController::class, 'approveOrganizer']);
        Route::post('/users/{user}/reject-organizer', [UserRoleController::class, 'rejectOrganizer']);
        Route::get('/events', [AdminEventController::class, 'index']);
        Route::post('/events', [AdminEventController::class, 'store']);
        Route::get('/events/{event}', [AdminEventController::class, 'show']);
        Route::patch('/events/{event}', [AdminEventController::class, 'update']);
        Route::delete('/events/{event}', [AdminEventController::class, 'destroy']);
        Route::post('/events/{event}/publish', [AdminEventController::class, 'publish']);
        Route::post('/events/{event}/reject', [AdminEventController::class, 'reject']);
        Route::post('/events/{event}/images', [EventImageController::class, 'store']);
        Route::patch('/event-images/{eventImage}', [EventImageController::class, 'update']);
        Route::delete('/event-images/{eventImage}', [EventImageController::class, 'destroy']);
        Route::post('/events/{event}/ticket-types', [TicketTypeController::class, 'store']);
        Route::patch('/ticket-types/{ticketType}', [TicketTypeController::class, 'update']);
        Route::delete('/ticket-types/{ticketType}', [TicketTypeController::class, 'destroy']);
        Route::patch('/ticket-types/{ticketType}/inventory', [TicketTypeController::class, 'adjustInventory']);
    });
});
