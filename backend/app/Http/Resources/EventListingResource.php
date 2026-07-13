<?php

namespace App\Http\Resources;

use App\Models\EventImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventListingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $primaryImage = $this->primaryImage();
        $bannerImage = $this->bannerImage();
        $imageUrl = $primaryImage instanceof EventImage
            ? $primaryImage->publicUrl()
            : $this->banner_image_url;
        $bannerImageUrl = $bannerImage instanceof EventImage
            ? $bannerImage->publicUrl()
            : ($this->banner_image_url ?: $imageUrl);
        $minimumPrice = $this->minimum_price ?? $this->base_price;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'image' => $imageUrl,
            'banner_image_url' => $bannerImageUrl,
            'primary_image_url' => $imageUrl,
            'primary_image' => $primaryImage instanceof EventImage ? new EventImageResource($primaryImage) : null,
            'banner_image' => $bannerImage instanceof EventImage ? new EventImageResource($bannerImage) : null,
            'gallery_images' => EventImageResource::collection($this->galleryImages()),
            'category' => $this->category,
            'venue' => $this->venue_name,
            'venue_name' => $this->venue_name,
            'city' => $this->city,
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            'timezone' => $this->timezone ?: 'Europe/Pristina',
            'minimum_price' => $minimumPrice !== null ? (float) $minimumPrice : null,
            'price_from' => $minimumPrice !== null ? (float) $minimumPrice : null,
            'base_price' => $minimumPrice !== null ? (float) $minimumPrice : null,
            'currency' => $this->currency ?: 'USD',
            'status' => $this->status,
            'event_state' => $this->listingState(),
        ];
    }

    private function listingState(): array
    {
        if ($this->salesAreClosed()) {
            return ['key' => 'ended', 'label' => 'Ended'];
        }

        if ($this->starts_at && now()->gte($this->starts_at)) {
            return ['key' => 'live', 'label' => 'Live'];
        }

        return ['key' => 'upcoming', 'label' => 'Upcoming'];
    }
}
