<?php

namespace App\Services\Reservations;

use App\Models\Reservation;
use App\Models\Venue;
use Carbon\Carbon;

class ReservationAvailabilityService
{
    /**
     * @return array<int, array{time: string, available: bool}>
     */
    public function availableSlots(Venue $venue, Carbon $date): array
    {
        if ($venue->status !== Venue::STATUS_ACTIVE || $date->isPast() && ! $date->isToday()) {
            return [];
        }

        if ($this->bookingHorizonError($venue, $date)) {
            return [];
        }

        $dateValue = $date->format('Y-m-d');

        if ($venue->blackoutDates()->whereDate('date', $dateValue)->exists()) {
            return [];
        }

        $hours = $this->hoursForDate($venue, $date);
        if (! $hours || $hours['is_closed'] || ! $hours['opens_at'] || ! $hours['closes_at']) {
            return [];
        }

        $opensAtMinutes = $this->timeToMinutes((string) $hours['opens_at']);
        $closesAtMinutes = $this->timeToMinutes((string) $hours['closes_at']);
        if ($opensAtMinutes === null || $closesAtMinutes === null) {
            return [];
        }

        $interval = max(1, (int) ($venue->reservation_interval_minutes ?: 30));
        $closingBoundaryMinutes = $this->closingBoundaryMinutes($opensAtMinutes, $closesAtMinutes);
        $lastReservationMinutes = $this->lastReservationBoundaryMinutes($venue, $opensAtMinutes, $closingBoundaryMinutes);
        $now = now();
        $slots = [];

        foreach ($this->slotMinutes($opensAtMinutes, $closingBoundaryMinutes, $interval) as $minutes) {
            if ($lastReservationMinutes !== null && $minutes > $lastReservationMinutes) {
                continue;
            }

            $slotAt = $date->copy()->startOfDay()->addMinutes($minutes);
            if ($slotAt->lte($now)) {
                continue;
            }

            $time = $this->minutesToTime($minutes);
            if (! $this->slotIsFull($venue, $dateValue, $time)) {
                $slots[] = [
                    'time' => $time,
                    'available' => true,
                ];
            }
        }

        return $slots;
    }

    public function availabilityError(Venue $venue, Carbon $reservationAt): ?array
    {
        $date = $reservationAt->format('Y-m-d');

        $bookingHorizonError = $this->bookingHorizonError($venue, $reservationAt, 'reservation_date');
        if ($bookingHorizonError) {
            return $bookingHorizonError;
        }

        if ($venue->blackoutDates()->whereDate('date', $date)->exists()) {
            return [
                'field' => 'reservation_date',
                'message' => 'This restaurant or bar is not accepting reservations on this date.',
            ];
        }

        $specialHour = $venue->specialHours()->whereDate('date', $date)->first();
        if ($specialHour) {
            $error = $this->hoursError(
                $reservationAt,
                $specialHour->is_closed,
                $specialHour->opens_at,
                $specialHour->closes_at,
                'This venue is closed on the selected day.',
                'This venue is closed at the selected time.',
            );

            return $error
                ?: $this->generatedSlotError($venue, $reservationAt, $specialHour->opens_at, $specialHour->closes_at)
                ?: $this->lastReservationTimeError($venue, $reservationAt, $specialHour->opens_at, $specialHour->closes_at);
        }

        $openingHour = $venue->openingHours()
            ->where('day_of_week', $reservationAt->dayOfWeekIso - 1)
            ->first();

        if (! $openingHour) {
            return [
                'field' => 'reservation_time',
                'message' => 'Please select a valid reservation time.',
            ];
        }

        $error = $this->hoursError(
            $reservationAt,
            $openingHour->is_closed,
            $openingHour->opens_at,
            $openingHour->closes_at,
            'This venue is closed on the selected day.',
            'This venue is closed at the selected time.',
        );

        return $error
            ?: $this->generatedSlotError($venue, $reservationAt, $openingHour->opens_at, $openingHour->closes_at)
            ?: $this->lastReservationTimeError($venue, $reservationAt, $openingHour->opens_at, $openingHour->closes_at);
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

    public function bookingHorizonError(Venue $venue, Carbon $date, string $field = 'date'): ?array
    {
        $selectedDate = $date->copy()->startOfDay();
        $maxDate = now($date->getTimezone())->startOfDay()->addDays($this->bookingHorizonDays($venue));

        if ($selectedDate->gt($maxDate)) {
            return [
                'field' => $field,
                'message' => "Reservations may only be made up to {$this->bookingHorizonDays($venue)} days in advance.",
            ];
        }

        return null;
    }

    public function bookingHorizonDays(Venue $venue): int
    {
        return (int) ($venue->booking_horizon_days ?: Venue::DEFAULT_BOOKING_HORIZON_DAYS);
    }

    /**
     * @return array<int, string>
     */
    public function timeVariants(string $time): array
    {
        $value = preg_match('/^\d{2}:\d{2}:\d{2}$/', $time) ? substr($time, 0, 5) : $time;

        return [$value, "{$value}:00"];
    }

    /**
     * @return array{opens_at: mixed, closes_at: mixed, is_closed: bool}|null
     */
    private function hoursForDate(Venue $venue, Carbon $date): ?array
    {
        $dateValue = $date->format('Y-m-d');
        $specialHour = $venue->specialHours()->whereDate('date', $dateValue)->first();
        if ($specialHour) {
            return [
                'opens_at' => $specialHour->opens_at,
                'closes_at' => $specialHour->closes_at,
                'is_closed' => (bool) $specialHour->is_closed,
            ];
        }

        $openingHour = $venue->openingHours()
            ->where('day_of_week', $date->dayOfWeekIso - 1)
            ->first();

        if (! $openingHour) {
            return null;
        }

        return [
            'opens_at' => $openingHour->opens_at,
            'closes_at' => $openingHour->closes_at,
            'is_closed' => (bool) $openingHour->is_closed,
        ];
    }

    /**
     * @return array<int, int>
     */
    private function slotMinutes(int $opensAtMinutes, int $closingBoundaryMinutes, int $interval): array
    {
        $minutes = [];

        // Slots are reservation starts. The final start must not run past closing.
        for ($slot = $opensAtMinutes; $slot + $interval <= $closingBoundaryMinutes; $slot += $interval) {
            $minutes[] = $slot;
        }

        return $minutes;
    }

    private function closingBoundaryMinutes(int $opensAtMinutes, int $closesAtMinutes): int
    {
        return $closesAtMinutes > $opensAtMinutes
            ? $closesAtMinutes
            : $closesAtMinutes + (24 * 60);
    }

    private function lastReservationBoundaryMinutes(Venue $venue, int $opensAtMinutes, int $closingBoundaryMinutes): ?int
    {
        if (! $venue->last_reservation_time) {
            return null;
        }

        $minutes = $this->timeToMinutes((string) $venue->last_reservation_time);
        if ($minutes === null) {
            return null;
        }

        if ($closingBoundaryMinutes > 24 * 60 && $minutes < $opensAtMinutes) {
            return $minutes + (24 * 60);
        }

        return $minutes;
    }

    private function minutesToTime(int $minutes): string
    {
        $minutes %= 24 * 60;

        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
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

    private function generatedSlotError(Venue $venue, Carbon $reservationAt, mixed $opensAt, mixed $closesAt): ?array
    {
        $opensAtMinutes = $this->timeToMinutes((string) $opensAt);
        $closesAtMinutes = $this->timeToMinutes((string) $closesAt);

        if ($opensAtMinutes === null || $closesAtMinutes === null) {
            return null;
        }

        $interval = max(1, (int) ($venue->reservation_interval_minutes ?: 30));
        $closingBoundaryMinutes = $this->closingBoundaryMinutes($opensAtMinutes, $closesAtMinutes);
        $reservationMinutes = $this->reservationTimelineMinutes($reservationAt, $opensAtMinutes, $closingBoundaryMinutes);

        if (! in_array($reservationMinutes, $this->slotMinutes($opensAtMinutes, $closingBoundaryMinutes, $interval), true)) {
            return [
                'field' => 'reservation_time',
                'message' => 'Please select a valid reservation time.',
            ];
        }

        return null;
    }

    private function reservationTimelineMinutes(Carbon $reservationAt, int $opensAtMinutes, int $closingBoundaryMinutes): int
    {
        $minutes = ($reservationAt->hour * 60) + $reservationAt->minute;

        if ($closingBoundaryMinutes > 24 * 60 && $minutes < $opensAtMinutes) {
            return $minutes + (24 * 60);
        }

        return $minutes;
    }

    private function lastReservationTimeError(Venue $venue, Carbon $reservationAt, mixed $opensAt, mixed $closesAt): ?array
    {
        if (! $venue->last_reservation_time) {
            return null;
        }

        $opensAtMinutes = $this->timeToMinutes((string) $opensAt);
        $closesAtMinutes = $this->timeToMinutes((string) $closesAt);
        $lastReservationMinutes = $this->timeToMinutes((string) $venue->last_reservation_time);
        if ($opensAtMinutes === null || $closesAtMinutes === null || $lastReservationMinutes === null) {
            return null;
        }

        $closingBoundaryMinutes = $this->closingBoundaryMinutes($opensAtMinutes, $closesAtMinutes);
        if ($closingBoundaryMinutes > 24 * 60 && $lastReservationMinutes < $opensAtMinutes) {
            $lastReservationMinutes += 24 * 60;
        }

        $reservationMinutes = $this->reservationTimelineMinutes($reservationAt, $opensAtMinutes, $closingBoundaryMinutes);
        if ($reservationMinutes > $lastReservationMinutes) {
            return [
                'field' => 'reservation_time',
                'message' => 'This venue is closed at the selected time.',
            ];
        }

        return null;
    }
}
