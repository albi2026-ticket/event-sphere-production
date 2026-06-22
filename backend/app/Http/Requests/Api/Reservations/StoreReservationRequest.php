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
            'reservation_time' => ['required', 'date_format:H:i'],
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

                if (! $venue || $venue->status !== Venue::STATUS_ACTIVE || ! $venue->reservation_enabled) {
                    $validator->errors()->add('venue_id', 'This venue is not available for reservations.');

                    return;
                }

                $partySize = (int) $this->input('party_size');
                if ($partySize < $venue->min_guests || $partySize > $venue->max_guests) {
                    $validator->errors()->add('party_size', "Please select between {$venue->min_guests} and {$venue->max_guests} guests.");
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
                }
            },
        ];
    }
}
