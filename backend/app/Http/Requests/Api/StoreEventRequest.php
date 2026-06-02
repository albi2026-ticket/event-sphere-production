<?php

namespace App\Http\Requests\Api;

use App\Models\Event;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEventRequest extends FormRequest
{
    private const EVENT_TIMEZONE = 'Europe/Pristina';
    private const EVENT_CALCULATION_TIMEZONE = 'Europe/Belgrade';

    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) $user && ($user->isAdmin() || $user->isOrganizer());
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'organizer_id' => ['sometimes', 'integer', Rule::exists(User::class, 'id')],
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique(Event::class, 'slug')],
            'category' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'venue_name' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'timezone' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'cancelled', 'completed', 'pending_review', 'rejected'])],
            'visibility' => ['sometimes', Rule::in(['public', 'private', 'unlisted'])],
            'banner_image_url' => ['nullable', 'url', 'max:2048'],
            'max_tickets_per_user' => ['nullable', 'integer', 'min:1'],
            'base_price' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'is_featured' => ['sometimes', 'boolean'],
            'is_trending' => ['sometimes', 'boolean'],
            'is_verified' => ['sometimes', 'boolean'],
            'allow_resale' => ['sometimes', 'boolean'],
            'refund_policy' => ['nullable', 'string', 'max:255'],
            'moderation_notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge($this->normalizeEventTimes($this->all()));
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    protected function normalizeEventTimes(array $payload): array
    {
        $payload['timezone'] = self::EVENT_TIMEZONE;

        foreach (['starts_at', 'ends_at'] as $field) {
            if (! isset($payload[$field]) || $payload[$field] === '') {
                continue;
            }

            $payload[$field] = Carbon::parse((string) $payload[$field], self::EVENT_CALCULATION_TIMEZONE)
                ->utc()
                ->toISOString();
        }

        return $payload;
    }
}
