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
use App\Models\Venue;
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
        $venue = Venue::query()->with('owner')->findOrFail($request->validated('venue_id'));

        $reservation = Reservation::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'guest_name' => $user->name ?: trim(($user->first_name ?? '').' '.($user->last_name ?? '')) ?: 'Event Sphere guest',
            'phone' => $request->validated('phone') ?: $user->phone,
            'party_size' => $request->validated('party_size'),
            'reservation_date' => $request->validated('reservation_date'),
            'reservation_time' => $request->validated('reservation_time'),
            'status' => Reservation::STATUS_PENDING,
            'notes' => $request->validated('notes'),
        ]);

        $reservation = $reservation->fresh(['venue.owner', 'user']);

        Mail::to($user->email, $reservation->guest_name)
            ->send(new ReservationRequestReceivedMail($reservation));

        if ($reservation->venue->owner?->email) {
            Mail::to($reservation->venue->owner->email, $reservation->venue->owner->name)
                ->send(new NewReservationReceivedMail($reservation));
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
            abort(422, 'This reservation has already been cancelled.');
        }

        if (! in_array($reservation->status, [Reservation::STATUS_PENDING, Reservation::STATUS_CONFIRMED], true)) {
            abort(422, 'This reservation can no longer be cancelled.');
        }

        $reservationTime = explode('.', (string) $reservation->reservation_time)[0];
        $reservationDateTime = Carbon::parse($reservation->reservation_date->format('Y-m-d').' '.$reservationTime);

        if ($reservationDateTime->lte(now())) {
            throw ValidationException::withMessages([
                'reservation' => ['This reservation can no longer be cancelled.'],
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
                ->send(new ReservationCancelledMail($reservation));
        }

        if ($reservation->venue->owner?->email) {
            Mail::to($reservation->venue->owner->email, $reservation->venue->owner->name)
                ->send(new ReservationCancelledByGuestMail($reservation));
        }

        return new ReservationResource($reservation);
    }
}
