<?php

namespace App\Http\Resources;

use App\Models\EventImage;
use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventListingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return Profiler::section('EventListingResource::toArray', function (): array {
            $primaryImage = Profiler::section('EventListingResource primaryImage accessor', fn () => $this->primaryImage());
            $bannerImage = Profiler::section('EventListingResource bannerImage accessor', fn () => $this->bannerImage());
            $imageUrl = Profiler::section('EventListingResource primary publicUrl/fallback', fn () => $primaryImage instanceof EventImage
            ? $primaryImage->publicUrl()
            : $this->banner_image_url);
            $bannerImageUrl = Profiler::section('EventListingResource banner publicUrl/fallback', fn () => $bannerImage instanceof EventImage
            ? $bannerImage->publicUrl()
            : ($this->banner_image_url ?: $imageUrl));
            $minimumPrice = Profiler::section('EventListingResource minimum price fallback', fn () => $this->minimum_price ?? $this->base_price);
            $galleryImages = Profiler::section('EventListingResource galleryImages accessor', fn () => $this->galleryImages());
            $eventState = Profiler::section('EventListingResource listingState helper', fn (): array => $this->listingState());

            return Profiler::section('EventListingResource payload array build', fn (): array => [
                'id' => $this->id,
                'title' => $this->title,
                'slug' => $this->slug,
                'image' => $imageUrl,
                'banner_image_url' => $bannerImageUrl,
                'primary_image_url' => $imageUrl,
                'primary_image' => $primaryImage instanceof EventImage ? new EventImageResource($primaryImage) : null,
                'banner_image' => $bannerImage instanceof EventImage ? new EventImageResource($bannerImage) : null,
                'gallery_images' => Profiler::section('EventListingResource EventImageResource collection create', fn () => EventImageResource::collection($galleryImages)),
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
                'event_state' => $eventState,
            ]);
        });
    }

    private function listingState(): array
    {
        if (Profiler::section('EventListingResource salesAreClosed accessor', fn (): bool => $this->salesAreClosed())) {
            return ['key' => 'ended', 'label' => 'Ended'];
        }

        if ($this->starts_at && now()->gte($this->starts_at)) {
            return ['key' => 'live', 'label' => 'Live'];
        }

        return ['key' => 'upcoming', 'label' => 'Upcoming'];
    }
}
