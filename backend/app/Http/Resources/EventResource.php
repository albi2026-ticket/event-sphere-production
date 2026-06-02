<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $primaryImage = $this->whenLoaded('images', fn () => $this->images->firstWhere('is_primary', true) ?? $this->images->first());
        $bannerImageUrl = $primaryImage instanceof \App\Models\EventImage
            ? $primaryImage->publicUrl()
            : $this->banner_image_url;

        return [
            'id' => $this->id,
            'organizer_id' => $this->organizer_id,
            'organizer' => $this->whenLoaded('organizer', fn () => [
                'id' => $this->organizer->id,
                'name' => $this->organizer->name,
                'role' => $this->organizer->role,
            ]),
            'title' => $this->title,
            'slug' => $this->slug,
            'category' => $this->category,
            'description' => $this->description,
            'venue_name' => $this->venue_name,
            'city' => $this->city,
            'country' => $this->country,
            'address' => $this->address,
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            'timezone' => $this->timezone,
            'status' => $this->status,
            'visibility' => $this->visibility,
            'banner_image_url' => $bannerImageUrl,
            'base_price' => $this->base_price,
            'currency' => $this->currency,
            'is_featured' => $this->is_featured,
            'is_trending' => $this->is_trending,
            'is_verified' => $this->is_verified,
            'allow_resale' => $this->allow_resale,
            'refund_policy' => $this->refund_policy,
            'moderation_notes' => $this->moderation_notes,
            'views_count' => $this->views_count,
            'images' => EventImageResource::collection($this->whenLoaded('images')),
            'ticket_types' => TicketTypeResource::collection($this->whenLoaded('ticketTypes')),
            'reviews_count' => $this->whenCounted('reviews'),
            'tickets_count' => $this->whenCounted('tickets'),
            'favorites_count' => $this->whenCounted('favorites'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
