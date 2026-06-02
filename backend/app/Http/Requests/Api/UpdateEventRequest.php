<?php

namespace App\Http\Requests\Api;

use App\Models\Event;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        $event = $this->route('event');

        return $event instanceof Event && $this->user()?->canManageEvent($event);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $event = $this->route('event');

        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique(Event::class, 'slug')->ignore($event?->id)],
            'category' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'venue_name' => ['sometimes', 'string', 'max:255'],
            'city' => ['sometimes', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'starts_at' => ['sometimes', 'date'],
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
}
