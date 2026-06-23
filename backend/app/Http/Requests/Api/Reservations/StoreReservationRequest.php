<?php

namespace App\Http\Requests\Api\Reservations;

use App\Models\Venue;
use Carbon\Carbon;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'venue_id' => ['required', 'integer', Rule::exists(Venue::class, 'id')],
            'phone' => ['nullable', 'string', 'max:255'],
            'party_size' => ['required', 'integer', 'min:1', 'max:1000'],
            'reservation_date' => ['required', 'date_format:Y-m-d'],
            'reservation_time' => ['required', 'date_format:H:i', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! $this->isAlignedReservationTime((string) $value)) {
                    $fail('Please select a valid reservation time.');
                }
            }],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'venue_id.required' => 'This venue is not available for reservations.',
            'venue_id.exists' => 'This venue is not available for reservations.',
            'party_size.required' => 'Please select number of guests.',
            'party_size.integer' => 'Please select number of guests.',
            'party_size.min' => 'Please select number of guests.',
            'reservation_date.required' => 'Please select date and time.',
            'reservation_date.date_format' => 'Please select date and time.',
            'reservation_time.required' => 'Please select date and time.',
            'reservation_time.date_format' => 'Please select date and time.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $venue = Venue::query()->find($this->input('venue_id'));

                if (! $venue || $venue->status !== Venue::STATUS_ACTIVE) {
                    $validator->errors()->add('venue_id', 'This venue is not available for reservations.');

                    return;
                }

                $partySize = (int) $this->input('party_size');
                if ($partySize < $venue->min_guests) {
                    $validator->errors()->add('party_size', "Minimum guests allowed is {$venue->min_guests}.");
                }

                if ($partySize > $venue->max_guests) {
                    $validator->errors()->add('party_size', "Maximum guests allowed is {$venue->max_guests}.");
                }

                if (! $this->filled('reservation_date') || ! $this->filled('reservation_time')) {
                    return;
                }

                try {
                    $reservationAt = Carbon::createFromFormat(
                        'Y-m-d H:i',
                        $this->input('reservation_date').' '.$this->input('reservation_time'),
                        config('app.timezone'),
                    );
                } catch (\Throwable) {
                    $validator->errors()->add('reservation_date', 'Please select date and time.');

                    return;
                }

                if ($reservationAt->isPast()) {
                    $validator->errors()->add('reservation_date', 'Please select a future date and time.');

                    return;
                }

                $this->validateOpeningHours($validator, $venue, $reservationAt);
            },
        ];
    }

    private function isAlignedReservationTime(string $value): bool
    {
        if (! preg_match('/^\d{2}:\d{2}$/', $value)) {
            return false;
        }

        [$hour, $minute] = array_map('intval', explode(':', $value));

        return $hour >= 0 && $hour <= 23 && in_array($minute, [0, 30], true);
    }

    private function validateOpeningHours(Validator $validator, Venue $venue, Carbon $reservationAt): void
    {
        $openingHour = $venue->openingHours()
            ->where('day_of_week', $reservationAt->dayOfWeekIso - 1)
            ->first();

        if (! $openingHour) {
            return;
        }

        if ($openingHour->is_closed) {
            $validator->errors()->add('reservation_date', 'This venue is closed on the selected day.');

            return;
        }

        if (! $openingHour->opens_at || ! $openingHour->closes_at) {
            $validator->errors()->add('reservation_time', 'This venue is closed at the selected time.');

            return;
        }

        $opensAt = $this->timeToMinutes((string) $openingHour->opens_at);
        $closesAt = $this->timeToMinutes((string) $openingHour->closes_at);
        $reservationMinutes = ($reservationAt->hour * 60) + $reservationAt->minute;

        if ($opensAt === null || $closesAt === null || $reservationMinutes < $opensAt || $reservationMinutes >= $closesAt) {
            $validator->errors()->add('reservation_time', 'This venue is closed at the selected time.');
        }
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
