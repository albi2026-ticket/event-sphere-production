<?php

namespace App\Http\Requests\Api\Venues;

use App\Models\CuisineType;
use App\Models\PaymentOption;
use App\Models\Venue;
use App\Models\VenueFacility;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVenueRequest extends FormRequest
{
    public function authorize(): bool
    {
        $venue = $this->route('venue');

        return $venue instanceof Venue && (bool) $this->user()?->canManageVenue($venue);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $venue = $this->route('venue');

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique(Venue::class, 'slug')->ignore($venue?->id)],
            'description' => ['nullable', 'string'],
            'venue_type' => ['sometimes', Rule::in([Venue::TYPE_RESTAURANT, Venue::TYPE_BAR, Venue::TYPE_LOUNGE, Venue::TYPE_CAFE])],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:2048'],
            'address' => ['nullable', 'string'],
            'city' => ['sometimes', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'logo_image' => ['nullable', 'string', 'max:2048'],
            'status' => ['sometimes', Rule::in([Venue::STATUS_DRAFT, Venue::STATUS_ACTIVE, Venue::STATUS_INACTIVE])],
            'featured' => ['sometimes', 'boolean'],
            'reservation_enabled' => ['sometimes', 'boolean'],
            'min_guests' => ['sometimes', 'integer', 'min:1', 'max:1000'],
            'max_guests' => ['sometimes', 'integer', 'min:1', 'max:1000', 'gte:min_guests'],
            'reservation_interval_minutes' => ['sometimes', 'integer', Rule::in([15, 30, 45, 60, 90, 120])],
            'last_reservation_time' => ['nullable', 'date_format:H:i'],
            'facebook_url' => ['nullable', 'url', 'max:2048'],
            'instagram_url' => ['nullable', 'url', 'max:2048'],
            'tiktok_url' => ['nullable', 'url', 'max:2048'],
            'facility_ids' => ['sometimes', 'array'],
            'facility_ids.*' => ['integer', Rule::exists(VenueFacility::class, 'id')],
            'cuisine_type_ids' => ['sometimes', 'array'],
            'cuisine_type_ids.*' => ['integer', Rule::exists(CuisineType::class, 'id')],
            'payment_option_ids' => ['sometimes', 'array'],
            'payment_option_ids.*' => ['integer', Rule::exists(PaymentOption::class, 'id')],
            'images' => ['sometimes', 'array'],
            'images.*.image_path' => ['required_with:images', 'string', 'max:2048'],
            'images.*.sort_order' => ['sometimes', 'integer', 'min:0'],
            'opening_hours' => ['sometimes', 'array', 'max:7'],
            'opening_hours.*.day_of_week' => ['required_with:opening_hours', 'integer', 'between:0,6', 'distinct'],
            'opening_hours.*.opens_at' => ['nullable', 'date_format:H:i'],
            'opening_hours.*.closes_at' => ['nullable', 'date_format:H:i'],
            'opening_hours.*.is_closed' => ['sometimes', 'boolean'],
        ];
    }
}
