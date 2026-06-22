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
            'venue' => $this->whenLoaded('venue', fn () => [
                'id' => $this->venue->id,
                'name' => $this->venue->name,
                'slug' => $this->venue->slug,
                'venue_type' => $this->venue->venue_type,
                'city' => $this->venue->city,
                'country' => $this->venue->country,
                'address' => $this->venue->address,
                'image_url' => $this->venue->relationLoaded('images')
                    ? $this->venue->images->sortBy('sort_order')->first()?->publicUrl()
                    : null,
            ]),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
