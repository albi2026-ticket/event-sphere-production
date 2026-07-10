<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Reservations\StoreReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Mail\NewReservationReceivedMail;
use App\Mail\ReservationCancelledByGuestMail;
use App\Mail\ReservationCancelledMail;
use App\Mail\ReservationRequestReceivedMail;
use App\Models\Reservation;
use App\Models\Notification;
use App\Services\Notifications\NotificationService;
use App\Services\Reservations\ReservationCreationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class ReservationController extends Controller
{
    public function store(StoreReservationRequest $request): ReservationResource
    {
        $user = $request->user();
        $reservation = app(ReservationCreationService::class)->create($user, $request->validated());

        $reservation = $reservation->fresh(['venue.images', 'venue.owner', 'user']);
        $venue = $reservation->venue;

        Mail::to($user->email, $reservation->guest_name)
            ->locale($user->preferred_language ?: 'en')
            ->queue(new ReservationRequestReceivedMail($reservation));

        if ($reservation->venue->owner?->email) {
            Mail::to($reservation->venue->owner->email, $reservation->venue->owner->name)
                ->locale($reservation->venue->owner->preferred_language ?: 'en')
                ->queue(new NewReservationReceivedMail($reservation));
        }

        $notifications = app(NotificationService::class);
        $notifications->create(
            $user,
            Notification::TYPE_RESERVATION_CREATED,
            __('notifications.reservation_request_created', [], $user->preferred_language ?: 'en'),
            __('notifications.reservation_request_created_message', ['venue' => $venue->name], $user->preferred_language ?: 'en'),
            '/site/my-reservations.html',
        );

        if ($reservation->venue->owner) {
            $notifications->create(
                $reservation->venue->owner,
                Notification::TYPE_RESERVATION_CREATED,
                __('notifications.new_reservation', [], $reservation->venue->owner->preferred_language ?: 'en'),
                __('notifications.new_reservation_message', [
                    'guest' => $reservation->guest_name,
                    'venue' => $venue->name,
                ], $reservation->venue->owner->preferred_language ?: 'en'),
                '/site/owner-venue.html',
            );
        }

        return new ReservationResource($reservation->load('venue.images'));
    }

    public function show(Request $request, Reservation $reservation): ReservationResource
    {
        abort_unless($reservation->user_id === $request->user()->id || $request->user()->isAdmin(), 403);

        return new ReservationResource($reservation->load('venue.images'));
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        $query = Reservation::query()
            ->where('user_id', $request->user()->id)
            ->with('venue.images')
            ->orderByDesc('reservation_date')
            ->orderByDesc('reservation_time');

        return ReservationResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function cancel(Request $request, Reservation $reservation): ReservationResource
    {
        abort_unless($reservation->user_id === $request->user()->id || $request->user()->isAdmin(), 403);

        $payload = $request->validate([
            'cancellation_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($reservation->status === Reservation::STATUS_CANCELLED) {
            abort(422, __('validation.custom.reservation_already_cancelled'));
        }

        if (! in_array($reservation->status, [Reservation::STATUS_PENDING, Reservation::STATUS_CONFIRMED], true)) {
            abort(422, __('validation.custom.reservation_cannot_cancel'));
        }

        $reservationTime = explode('.', (string) $reservation->reservation_time)[0];
        $reservationDateTime = Carbon::parse($reservation->reservation_date->format('Y-m-d').' '.$reservationTime);

        if ($reservationDateTime->lte(now())) {
            throw ValidationException::withMessages([
                'reservation' => [__('validation.custom.reservation_cannot_cancel')],
            ]);
        }

        $reservation->update([
            'status' => Reservation::STATUS_CANCELLED,
            'cancellation_reason' => $payload['cancellation_reason'] ?? null,
            'cancelled_at' => now(),
        ]);
        $reservation = $reservation->fresh(['venue.images', 'venue.owner', 'user']);

        if ($reservation->user?->email) {
            Mail::to($reservation->user->email, $reservation->guest_name)
                ->locale($reservation->user->preferred_language ?: 'en')
                ->queue(new ReservationCancelledMail($reservation));
        }

        if ($reservation->venue->owner?->email) {
            Mail::to($reservation->venue->owner->email, $reservation->venue->owner->name)
                ->locale($reservation->venue->owner->preferred_language ?: 'en')
                ->queue(new ReservationCancelledByGuestMail($reservation));
        }

        $notifications = app(NotificationService::class);
        if ($reservation->user) {
            $notifications->create(
                $reservation->user,
                Notification::TYPE_RESERVATION_CANCELLED_BY_USER,
                __('notifications.reservation_cancelled_successfully', [], $reservation->user->preferred_language ?: 'en'),
                __('notifications.reservation_cancelled_successfully_message', ['venue' => $reservation->venue->name], $reservation->user->preferred_language ?: 'en'),
                '/site/my-reservations.html',
            );
        }

        if ($reservation->venue->owner) {
            $notifications->create(
                $reservation->venue->owner,
                Notification::TYPE_RESERVATION_CANCELLED_BY_USER,
                __('notifications.reservation_cancelled_by_guest', [], $reservation->venue->owner->preferred_language ?: 'en'),
                __('notifications.reservation_cancelled_by_guest_message', [
                    'guest' => $reservation->guest_name,
                    'venue' => $reservation->venue->name,
                ], $reservation->venue->owner->preferred_language ?: 'en'),
                '/site/owner-venue.html',
            );
        }

        return new ReservationResource($reservation);
    }
}
