<?php

namespace App\Http\Resources;

use App\Models\EventImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $primaryImage = $this->whenLoaded('images', fn () => $this->images->firstWhere('is_primary', true) ?? $this->images->first());
        $bannerImageUrl = $primaryImage instanceof EventImage
            ? $primaryImage->publicUrl()
            : $this->banner_image_url;
        $ticketTypes = $this->relationLoaded('ticketTypes') ? $this->ticketTypes : collect();
        $availableInventory = (int) $ticketTypes->sum(function ($type): int {
            $checkoutReserved = (int) ($type->active_checkout_reserved_quantity ?? $type->activeCheckoutReservedQuantity());

            return max(0, $type->quantity_total - $type->quantity_sold - $type->quantity_reserved - $checkoutReserved);
        });

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
            'timezone' => $this->timezone ?: 'Europe/Pristina',
            'status' => $this->status,
            'visibility' => $this->visibility,
            'banner_image_url' => $bannerImageUrl,
            'image' => $bannerImageUrl,
            'max_tickets_per_user' => $this->max_tickets_per_user,
            'service_fee_percentage' => $this->service_fee_percentage ?? 10,
            'base_price' => $this->base_price,
            'currency' => $this->currency,
            'is_verified' => $this->is_verified,
            'refund_policy' => $this->refund_policy,
            'images' => EventImageResource::collection($this->whenLoaded('images')),
            'ticket_types' => TicketTypeResource::collection($this->whenLoaded('ticketTypes')),
            'available_inventory' => $availableInventory,
            'event_state' => $this->lifecycleState($availableInventory),
        ];
    }
}
