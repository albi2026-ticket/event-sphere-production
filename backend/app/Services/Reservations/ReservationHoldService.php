<?php

namespace App\Services\Reservations;

use App\Models\ReservationHold;
use App\Models\User;
use App\Models\Venue;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReservationHoldService
{
    public const HOLD_EXPIRED_MESSAGE = 'This reservation has expired.';

    public function create(User $user, array $payload): ReservationHold
    {
        return DB::transaction(function () use ($user, $payload): ReservationHold {
            $venue = Venue::query()
                ->whereKey($payload['venue_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $this->expireStaleHolds($user);

            $reservationAt = Carbon::createFromFormat(
                'Y-m-d H:i',
                $payload['reservation_date'].' '.$payload['reservation_time'],
                config('app.timezone'),
            );

            if ($reservationAt->isPast()) {
                throw ValidationException::withMessages([
                    'reservation_date' => 'Please select a future date and time.',
                ]);
            }

            $availabilityError = app(ReservationAvailabilityService::class)->availabilityError($venue, $reservationAt);
            if ($availabilityError) {
                throw ValidationException::withMessages([
                    $availabilityError['field'] => [$availabilityError['message']],
                ]);
            }

            $existing = ReservationHold::query()
                ->where('user_id', $user->id)
                ->where('venue_id', $venue->id)
                ->whereDate('reservation_date', $payload['reservation_date'])
                ->whereIn('reservation_time', app(ReservationAvailabilityService::class)->timeVariants((string) $payload['reservation_time']))
                ->where('status', ReservationHold::STATUS_ACTIVE)
                ->lockForUpdate()
                ->first();

            if ($existing && $existing->expires_at->isFuture()) {
                $existing->forceFill([
                    'party_size' => (int) $payload['party_size'],
                    'expires_at' => now()->addMinutes($this->expirationMinutes()),
                ])->save();

                return $existing->fresh(['venue', 'user']);
            }

            if (app(ReservationAvailabilityService::class)->slotIsFull(
                $venue,
                (string) $payload['reservation_date'],
                (string) $payload['reservation_time'],
            )) {
                throw ValidationException::withMessages([
                    'reservation_time' => [ReservationCreationService::SLOT_FULL_MESSAGE],
                ]);
            }

            $this->cancelOtherActiveHolds($user, $venue);

            return ReservationHold::query()->create([
                'venue_id' => $venue->id,
                'user_id' => $user->id,
                'party_size' => (int) $payload['party_size'],
                'reservation_date' => $payload['reservation_date'],
                'reservation_time' => $payload['reservation_time'],
                'reserved_at' => now(),
                'expires_at' => now()->addMinutes($this->expirationMinutes()),
                'status' => ReservationHold::STATUS_ACTIVE,
            ])->load(['venue', 'user']);
        });
    }

    public function validateForReservation(User $user, int $holdId, array $payload): ReservationHold
    {
        $hold = ReservationHold::query()
            ->whereKey($holdId)
            ->where('user_id', $user->id)
            ->lockForUpdate()
            ->firstOrFail();

        $this->ensureActive($hold);

        if ((int) $hold->venue_id !== (int) $payload['venue_id']
            || $hold->reservation_date?->format('Y-m-d') !== (string) $payload['reservation_date']
            || ! in_array((string) $payload['reservation_time'], app(ReservationAvailabilityService::class)->timeVariants((string) $hold->reservation_time), true)
            || (int) $hold->party_size !== (int) $payload['party_size']) {
            throw ValidationException::withMessages([
                'reservation_hold_id' => 'Reservation hold does not match the selected table details.',
            ]);
        }

        return $hold;
    }

    public function complete(ReservationHold $hold): void
    {
        $hold->forceFill(['status' => ReservationHold::STATUS_COMPLETED])->save();
    }

    public function cancel(ReservationHold $hold, string $status = ReservationHold::STATUS_CANCELLED): void
    {
        if ($hold->status === ReservationHold::STATUS_ACTIVE) {
            $hold->forceFill(['status' => $status])->save();
        }
    }

    public function expireStaleHolds(?User $user = null): int
    {
        return ReservationHold::query()
            ->where('status', ReservationHold::STATUS_ACTIVE)
            ->where('expires_at', '<', now())
            ->when($user, fn ($query) => $query->where('user_id', $user->id))
            ->update(['status' => ReservationHold::STATUS_EXPIRED]);
    }

    public function ensureActive(ReservationHold $hold): void
    {
        if ($hold->status !== ReservationHold::STATUS_ACTIVE) {
            throw ValidationException::withMessages([
                'reservation_hold_id' => 'This reservation hold is no longer active.',
            ]);
        }

        if ($hold->expires_at->isPast()) {
            $this->cancel($hold, ReservationHold::STATUS_EXPIRED);

            throw ValidationException::withMessages([
                'reservation_hold_id' => self::HOLD_EXPIRED_MESSAGE,
            ]);
        }
    }

    private function cancelOtherActiveHolds(User $user, Venue $venue): void
    {
        ReservationHold::query()
            ->where('user_id', $user->id)
            ->where('venue_id', $venue->id)
            ->where('status', ReservationHold::STATUS_ACTIVE)
            ->update(['status' => ReservationHold::STATUS_CANCELLED]);
    }

    private function expirationMinutes(): int
    {
        return 5;
    }
}
