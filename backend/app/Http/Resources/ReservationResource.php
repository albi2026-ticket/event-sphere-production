<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'venue_id' => $this->venue_id,
            'user_id' => $this->user_id,
            'guest_name' => $this->guest_name,
            'phone' => $this->phone,
            'party_size' => $this->party_size,
            'reservation_date' => $this->reservation_date?->format('Y-m-d'),
            'reservation_time' => $this->reservation_time,
            'status' => $this->status,
            'notes' => $this->notes,
            'occasion' => $this->occasion,
            'cancellation_reason' => $this->cancellation_reason,
            'owner_cancellation_reason' => $this->owner_cancellation_reason,
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'venue' => $this->whenLoaded('venue', fn () => [
                'id' => $this->venue->id,
                'name' => $this->venue->name,
                'slug' => $this->venue->slug,
                'venue_type' => $this->venue->venue_type,
                'city' => $this->venue->city,
                'country' => $this->venue->country,
                'address' => $this->venue->address,
                'owner' => $this->venue->relationLoaded('owner') && $this->venue->owner ? [
                    'id' => $this->venue->owner->id,
                    'name' => $this->venue->owner->name,
                    'email' => $this->venue->owner->email,
                ] : null,
                'image_url' => $this->venue->relationLoaded('images')
                    ? $this->venue->images->sortBy('sort_order')->first()?->publicUrl()
                    : null,
            ]),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'email_history' => [],
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'archived_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}
