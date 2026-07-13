<?php

namespace App\Http\Requests\Api\Reservations;

use App\Models\Venue;
use App\Services\Reservations\ReservationAvailabilityService;
use Carbon\Carbon;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        if (! $user->hasVerifiedEmail()) {
            throw new AuthorizationException(__('validation.custom.verify_email_reservation'));
        }

        return true;
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
            'occasion' => ['nullable', 'string', Rule::in([
                'Birthday',
                'Anniversary',
                'Date Night',
                'Business Meeting',
                'Family Gathering',
                'Celebration',
                'Friends Night Out',
                'Other',
            ])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'venue_id.required' => __('validation.custom.venue_unavailable'),
            'venue_id.exists' => __('validation.custom.venue_unavailable'),
            'party_size.required' => __('validation.custom.select_guests'),
            'party_size.integer' => __('validation.custom.select_guests'),
            'party_size.min' => __('validation.custom.select_guests'),
            'reservation_date.required' => __('validation.custom.select_date_time'),
            'reservation_date.date_format' => __('validation.custom.select_date_time'),
            'reservation_time.required' => __('validation.custom.select_date_time'),
            'reservation_time.date_format' => __('validation.custom.select_date_time'),
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $venue = Venue::query()->find($this->input('venue_id'));

                if (! $venue || $venue->status !== Venue::STATUS_ACTIVE) {
                    $validator->errors()->add('venue_id', __('validation.custom.venue_unavailable'));

                    return;
                }

                $partySize = (int) $this->input('party_size');
                if ($partySize < $venue->min_guests) {
                    $validator->errors()->add('party_size', __('validation.custom.min_guests_allowed', ['min' => $venue->min_guests]));
                }

                if ($partySize > $venue->max_guests) {
                    $validator->errors()->add('party_size', __('validation.custom.max_guests_allowed', ['max' => $venue->max_guests]));
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
                    $validator->errors()->add('reservation_date', __('validation.custom.select_date_time'));

                    return;
                }

                if ($reservationAt->isPast()) {
                    $validator->errors()->add('reservation_date', __('validation.custom.future_date_time'));

                    return;
                }

                $this->validateAvailability($validator, $venue, $reservationAt);
                $this->validateSlotCapacity($validator, $venue);
            },
        ];
    }

    private function validateAvailability(Validator $validator, Venue $venue, Carbon $reservationAt): void
    {
        $error = app(ReservationAvailabilityService::class)->availabilityError($venue, $reservationAt);
        if ($error) {
            $validator->errors()->add($error['field'], $error['message']);
        }
    }

    private function validateSlotCapacity(Validator $validator, Venue $venue): void
    {
        if ($validator->errors()->isNotEmpty()) {
            return;
        }

        $date = (string) $this->input('reservation_date');
        $time = (string) $this->input('reservation_time');

        if (app(ReservationAvailabilityService::class)->slotIsFull($venue, $date, $time)) {
            $validator->errors()->add('reservation_time', __('validation.custom.slot_full'));
        }
    }

}
