<?php

use App\Http\Controllers\Api\Admin\AdminEventController;
use App\Http\Controllers\Api\Admin\AdminOrganizerDashboardController;
use App\Http\Controllers\Api\Admin\AdminPaymentController;
use App\Http\Controllers\Api\Admin\AdminTicketController;
use App\Http\Controllers\Api\Admin\UserRoleController;
use App\Http\Controllers\Api\AuthUserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\EventImageController;
use App\Http\Controllers\Api\Organizer\OrganizerDashboardController;
use App\Http\Controllers\Api\Organizer\OrganizerEventController;
use App\Http\Controllers\Api\Organizer\OrganizerPaymentController;
use App\Http\Controllers\Api\Organizer\OrganizerTicketController;
use App\Http\Controllers\Api\Payments\CheckoutSessionController;
use App\Http\Controllers\Api\Payments\WebhookController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\TicketTypeController;
use App\Http\Controllers\Api\User\UserDashboardController;
use App\Http\Controllers\Api\User\UserFavoriteController;
use App\Http\Controllers\Api\User\UserOrderController;
use App\Http\Controllers\Api\User\UserProfileController;
use App\Http\Controllers\Api\User\UserTicketController;
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
Route::post('/stripe/webhook', WebhookController::class);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/user', [AuthUserController::class, 'show']);
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy']);

    Route::post('/email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1');

    Route::middleware('role:user,organizer,admin')->group(function (): void {
        Route::get('/me/dashboard', [DashboardController::class, 'user']);
        Route::get('/me/dashboard/summary', [UserDashboardController::class, 'summary']);
        Route::get('/me/dashboard/upcoming-events', [UserDashboardController::class, 'upcomingEvents']);
        Route::get('/me/profile', [UserProfileController::class, 'show']);
        Route::patch('/me/profile', [UserProfileController::class, 'update']);
        Route::get('/me/tickets', [UserTicketController::class, 'index']);
        Route::get('/me/tickets/active', [UserTicketController::class, 'active']);
        Route::get('/me/tickets/history', [UserTicketController::class, 'history']);
        Route::get('/me/orders', [UserOrderController::class, 'index']);
        Route::get('/me/orders/{order}', [UserOrderController::class, 'show']);
        Route::get('/me/orders/{order}/receipt', [UserOrderController::class, 'receipt']);
        Route::get('/me/favorites', [UserFavoriteController::class, 'index']);
        Route::post('/me/favorites', [UserFavoriteController::class, 'store']);
        Route::post('/me/favorites/toggle', [UserFavoriteController::class, 'toggle']);
        Route::delete('/me/favorites/{event}', [UserFavoriteController::class, 'destroy']);
        Route::post('/ticket-types/{ticketType}/reserve', [TicketTypeController::class, 'reserve']);
        Route::get('/orders/{order}/tickets', [TicketController::class, 'orderTickets']);
        Route::get('/orders/{order}/payment-status', [CheckoutSessionController::class, 'show']);
        Route::post('/orders/{order}/checkout-session', [CheckoutSessionController::class, 'store']);
        Route::get('/tickets/{ticket}', [TicketController::class, 'show']);
        Route::get('/tickets/{ticket}/qr-code', [TicketController::class, 'qrCode']);
        Route::get('/tickets/{ticket}/download', [TicketController::class, 'download']);
    });

    Route::middleware('role:organizer,admin')->group(function (): void {
        Route::post('/tickets/validate', [OrganizerTicketController::class, 'validateTicket']);
        Route::post('/tickets/check-in', [OrganizerTicketController::class, 'checkIn']);
    });

    Route::middleware('role:organizer')->prefix('organizer')->group(function (): void {
        Route::get('/dashboard', [DashboardController::class, 'organizer']);
        Route::get('/dashboard/summary', [OrganizerDashboardController::class, 'summary']);
        Route::get('/analytics', [OrganizerDashboardController::class, 'analytics']);
        Route::get('/analytics/revenue', [OrganizerDashboardController::class, 'revenue']);
        Route::get('/analytics/sales-trends', [OrganizerDashboardController::class, 'salesTrends']);
        Route::get('/events/performance', [OrganizerDashboardController::class, 'eventPerformance']);
        Route::get('/events/{event}/analytics', [OrganizerDashboardController::class, 'eventAnalytics'])->middleware('organizer.event');
        Route::get('/inventory', [OrganizerDashboardController::class, 'inventory']);
        Route::get('/orders/recent', [OrganizerDashboardController::class, 'recentOrders']);
        Route::get('/attendees', [OrganizerDashboardController::class, 'attendees']);
        Route::get('/payments', [OrganizerPaymentController::class, 'index']);
        Route::get('/payments/{order}', [OrganizerPaymentController::class, 'show']);
        Route::get('/events/{event}/attendees', [OrganizerTicketController::class, 'attendees']);
        Route::post('/tickets/validate', [OrganizerTicketController::class, 'validateTicket']);
        Route::post('/tickets/check-in', [OrganizerTicketController::class, 'checkIn']);
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
        Route::get('/organizers/{organizer}/dashboard/summary', [AdminOrganizerDashboardController::class, 'summary']);
        Route::get('/organizers/{organizer}/analytics', [AdminOrganizerDashboardController::class, 'analytics']);
        Route::get('/organizers/{organizer}/analytics/revenue', [AdminOrganizerDashboardController::class, 'revenue']);
        Route::get('/organizers/{organizer}/events/performance', [AdminOrganizerDashboardController::class, 'eventPerformance']);
        Route::get('/organizers/{organizer}/inventory', [AdminOrganizerDashboardController::class, 'inventory']);
        Route::get('/organizers/{organizer}/orders', [AdminOrganizerDashboardController::class, 'orders']);
        Route::get('/organizers/{organizer}/attendees', [AdminOrganizerDashboardController::class, 'attendees']);
        Route::get('/payments', [AdminPaymentController::class, 'index']);
        Route::get('/payments/{order}', [AdminPaymentController::class, 'show']);
        Route::post('/payments/{order}/refund', [AdminPaymentController::class, 'refund']);
        Route::get('/tickets', [AdminTicketController::class, 'index']);
        Route::post('/tickets/validate', [AdminTicketController::class, 'validateTicket']);
        Route::post('/tickets/check-in', [AdminTicketController::class, 'checkIn']);
        Route::get('/tickets/{ticket}', [AdminTicketController::class, 'show']);
        Route::patch('/tickets/{ticket}/status', [AdminTicketController::class, 'updateStatus']);
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
