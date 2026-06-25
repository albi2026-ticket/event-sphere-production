<?php

namespace App\Services\Reservations;

use App\Models\Reservation;
use App\Models\Venue;
use Carbon\Carbon;

class ReservationAvailabilityService
{
    public function availabilityError(Venue $venue, Carbon $reservationAt): ?array
    {
        $date = $reservationAt->format('Y-m-d');

        if ($venue->blackoutDates()->whereDate('date', $date)->exists()) {
            return [
                'field' => 'reservation_date',
                'message' => 'This restaurant or bar is not accepting reservations on this date.',
            ];
        }

        $specialHour = $venue->specialHours()->whereDate('date', $date)->first();
        if ($specialHour) {
            return $this->hoursError(
                $reservationAt,
                $specialHour->is_closed,
                $specialHour->opens_at,
                $specialHour->closes_at,
                'This venue is closed on the selected day.',
                'This venue is closed at the selected time.',
            );
        }

        $openingHour = $venue->openingHours()
            ->where('day_of_week', $reservationAt->dayOfWeekIso - 1)
            ->first();

        if (! $openingHour) {
            return null;
        }

        return $this->hoursError(
            $reservationAt,
            $openingHour->is_closed,
            $openingHour->opens_at,
            $openingHour->closes_at,
            'This venue is closed on the selected day.',
            'This venue is closed at the selected time.',
        );
    }

    public function slotReservationCount(Venue $venue, string $date, string $time): int
    {
        return Reservation::query()
            ->where('venue_id', $venue->id)
            ->whereDate('reservation_date', $date)
            ->whereIn('reservation_time', $this->timeVariants($time))
            ->where('status', '!=', Reservation::STATUS_CANCELLED)
            ->count();
    }

    public function slotIsFull(Venue $venue, string $date, string $time): bool
    {
        $limit = max(1, (int) ($venue->max_reservations_per_slot ?: 10));

        return $this->slotReservationCount($venue, $date, $time) >= $limit;
    }

    /**
     * @return array<int, string>
     */
    private function timeVariants(string $time): array
    {
        $value = preg_match('/^\d{2}:\d{2}:\d{2}$/', $time) ? substr($time, 0, 5) : $time;

        return [$value, "{$value}:00"];
    }

    private function hoursError(
        Carbon $reservationAt,
        bool $isClosed,
        mixed $opensAt,
        mixed $closesAt,
        string $closedDayMessage,
        string $closedTimeMessage,
    ): ?array {
        if ($isClosed) {
            return [
                'field' => 'reservation_date',
                'message' => $closedDayMessage,
            ];
        }

        if (! $opensAt || ! $closesAt) {
            return [
                'field' => 'reservation_time',
                'message' => $closedTimeMessage,
            ];
        }

        $opensAtMinutes = $this->timeToMinutes((string) $opensAt);
        $closesAtMinutes = $this->timeToMinutes((string) $closesAt);
        $reservationMinutes = ($reservationAt->hour * 60) + $reservationAt->minute;

        if ($opensAtMinutes === null || $closesAtMinutes === null) {
            return [
                'field' => 'reservation_time',
                'message' => $closedTimeMessage,
            ];
        }

        $insideHours = $opensAtMinutes < $closesAtMinutes
            ? $reservationMinutes >= $opensAtMinutes && $reservationMinutes < $closesAtMinutes
            : $reservationMinutes >= $opensAtMinutes || $reservationMinutes < $closesAtMinutes;

        if (! $insideHours) {
            return [
                'field' => 'reservation_time',
                'message' => $closedTimeMessage,
            ];
        }

        return null;
    }

    private function timeToMinutes(string $value): ?int
    {
        $time = preg_match('/^\d{2}:\d{2}:\d{2}$/', $value) ? substr($value, 0, 5) : $value;
        if (! preg_match('/^(\d{2}):(\d{2})$/', $time, $matches)) {
            return null;
        }

        return ((int) $matches[1] * 60) + (int) $matches[2];
    }
}
