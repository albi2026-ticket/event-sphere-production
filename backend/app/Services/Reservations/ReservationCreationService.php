<?php

namespace App\Services\Reservations;

use App\Models\Reservation;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReservationCreationService
{
    public const SLOT_FULL_MESSAGE = 'This reservation slot has just become fully booked. Please choose another time.';

    /**
     * @param  array<string, mixed>  $payload
     */
    public function create(User $user, array $payload): Reservation
    {
        return DB::transaction(function () use ($user, $payload): Reservation {
            $venue = Venue::query()
                ->whereKey($payload['venue_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $duplicate = Reservation::query()
                ->where('venue_id', $venue->id)
                ->where('user_id', $user->id)
                ->where('reservation_date', $payload['reservation_date'])
                ->where('reservation_time', $payload['reservation_time'])
                ->where('party_size', $payload['party_size'])
                ->whereIn('status', [Reservation::STATUS_PENDING, Reservation::STATUS_CONFIRMED])
                ->where('created_at', '>=', now()->subMinutes(2))
                ->latest('id')
                ->first();

            if ($duplicate) {
                return $duplicate;
            }

            if (app(ReservationAvailabilityService::class)->slotIsFull(
                $venue,
                (string) $payload['reservation_date'],
                (string) $payload['reservation_time'],
            )) {
                throw ValidationException::withMessages([
                    'reservation_time' => [self::SLOT_FULL_MESSAGE],
                ]);
            }

            $reservation = Reservation::query()->create([
                'venue_id' => $venue->id,
                'user_id' => $user->id,
                'guest_name' => $user->name ?: trim(($user->first_name ?? '').' '.($user->last_name ?? '')) ?: 'Tiketa guest',
                'phone' => ($payload['phone'] ?? null) ?: $user->phone,
                'party_size' => $payload['party_size'],
                'reservation_date' => $payload['reservation_date'],
                'reservation_time' => $payload['reservation_time'],
                'status' => Reservation::STATUS_PENDING,
                'notes' => $payload['notes'] ?? null,
                'occasion' => $payload['occasion'] ?? null,
            ]);

            return $reservation;
        });
    }
}
