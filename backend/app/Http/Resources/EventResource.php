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
        $ticketTypes = $this->relationLoaded('ticketTypes') ? $this->ticketTypes : collect();
        $totalInventory = (int) $ticketTypes->sum('quantity_total');
        $soldTickets = (int) $ticketTypes->sum('quantity_sold');
        $paidTicketsSold = (int) ($this->tickets_sold_count ?? $soldTickets);
        $recentTicketsSold = (int) ($this->recent_tickets_sold_count ?? 0);
        $favoritesCount = (int) ($this->favorites_count ?? 0);
        $reviewsCount = (int) ($this->reviews_count ?? 0);
        $popularityScore = ($recentTicketsSold * 5)
            + ($paidTicketsSold * 3)
            + ($favoritesCount * 2)
            + $reviewsCount
            + (int) floor(((int) $this->views_count) / 10);
        $availableInventory = (int) $ticketTypes->sum(fn ($type) => $type->availableQuantity());
        $eventState = $this->lifecycleState($availableInventory);

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
            'max_tickets_per_user' => $this->max_tickets_per_user,
            'service_fee_percentage' => $this->service_fee_percentage ?? 10,
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
            'sold_tickets' => $soldTickets,
            'tickets_sold_count' => $paidTicketsSold,
            'recent_tickets_sold_count' => $recentTicketsSold,
            'popularity_score' => $popularityScore,
            'total_inventory' => $totalInventory,
            'available_inventory' => $availableInventory,
            'event_state' => $eventState,
            'reviews_count' => $this->whenCounted('reviews'),
            'tickets_count' => $this->whenCounted('tickets'),
            'favorites_count' => $this->whenCounted('favorites'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
