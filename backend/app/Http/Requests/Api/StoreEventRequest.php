<?php

namespace App\Http\Requests\Api;

use App\Models\Event;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEventRequest extends FormRequest
{
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
}
