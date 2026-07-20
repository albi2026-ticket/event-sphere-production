<?php

namespace App\Http\Resources;

use App\Models\EventImage;
use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return Profiler::section('EventDetailResource::toArray', function (): array {
            $primaryImage = Profiler::section('EventDetailResource primaryImage accessor', fn () => $this->primaryImage());
            $bannerImage = Profiler::section('EventDetailResource bannerImage accessor', fn () => $this->bannerImage());
            $primaryImageUrl = Profiler::section('EventDetailResource primary publicUrl', fn () => $primaryImage instanceof EventImage ? $primaryImage->publicUrl() : null);
            $bannerImageUrl = Profiler::section('EventDetailResource banner publicUrl/fallback', fn () => $bannerImage instanceof EventImage
            ? $bannerImage->publicUrl()
            : ($this->banner_image_url ?: $primaryImageUrl));
            $ticketTypes = Profiler::section('EventDetailResource ticketTypes relation read', fn () => $this->relationLoaded('ticketTypes') ? $this->ticketTypes : collect());
            $availableInventory = Profiler::section('EventDetailResource ticketTypes sum availableInventory', fn (): int => (int) $ticketTypes->sum(function ($type): int {
            $checkoutReserved = (int) ($type->active_checkout_reserved_quantity ?? $type->activeCheckoutReservedQuantity());

            return max(0, $type->quantity_total - $type->quantity_sold - $type->quantity_reserved - $checkoutReserved);
            }));
            $galleryImages = Profiler::section('EventDetailResource galleryImages accessor', fn () => $this->galleryImages());
            $eventState = Profiler::section('EventDetailResource lifecycleState helper', fn (): array => $this->lifecycleState($availableInventory));

            return Profiler::section('EventDetailResource payload array build', fn (): array => [
                'id' => $this->id,
                'organizer_id' => $this->organizer_id,
                'organizer' => $this->whenLoaded('organizer', fn () => Profiler::section('EventDetailResource organizer transform', fn (): array => [
                    'id' => $this->organizer->id,
                    'name' => $this->organizer->name,
                    'role' => $this->organizer->role,
                ])),
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
                'primary_image_url' => $primaryImageUrl,
                'primary_image' => $primaryImage instanceof EventImage ? new EventImageResource($primaryImage) : null,
                'banner_image' => $bannerImage instanceof EventImage ? new EventImageResource($bannerImage) : null,
                'gallery_images' => Profiler::section('EventDetailResource gallery EventImageResource collection create', fn () => EventImageResource::collection($galleryImages)),
                'max_tickets_per_user' => $this->max_tickets_per_user,
                'service_fee_percentage' => $this->service_fee_percentage ?? 10,
                'base_price' => $this->base_price,
                'currency' => $this->currency,
                'is_verified' => $this->is_verified,
                'refund_policy' => $this->refund_policy,
                'images' => Profiler::section('EventDetailResource images resource collection create', fn () => EventImageResource::collection($this->whenLoaded('images'))),
                'ticket_types' => Profiler::section('EventDetailResource ticket type resource collection create', fn () => TicketTypeResource::collection($this->whenLoaded('ticketTypes'))),
                'available_inventory' => $availableInventory,
                'event_state' => $eventState,
            ]);
        });
    }
}
