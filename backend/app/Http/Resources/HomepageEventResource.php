<?php

namespace App\Http\Resources;

use App\Models\EventImage;
use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HomepageEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return Profiler::section('HomepageEventResource::toArray', function () use ($request): array {
            $primaryImage = Profiler::section('HomepageEventResource primaryImage accessor', fn () => $this->primaryImage());
            $bannerImage = Profiler::section('HomepageEventResource bannerImage accessor', fn () => $this->bannerImage());
            $imageUrl = Profiler::section('HomepageEventResource primary publicUrl/fallback', fn () => $primaryImage instanceof EventImage
            ? $primaryImage->publicUrl()
            : $this->banner_image_url);
            $bannerImageUrl = Profiler::section('HomepageEventResource banner publicUrl/fallback', fn () => $bannerImage instanceof EventImage
            ? $bannerImage->publicUrl()
            : ($this->banner_image_url ?: $imageUrl));
            $priceFrom = Profiler::section('HomepageEventResource price fallback', fn () => $this->price_from ?? $this->base_price);
            $galleryImages = Profiler::section('HomepageEventResource galleryImages accessor', fn () => $this->galleryImages());

            return Profiler::section('HomepageEventResource payload array build', fn (): array => [
                'id' => $this->id,
                'title' => $this->title,
                'slug' => $this->slug,
                'image' => $imageUrl,
                'banner_image_url' => $bannerImageUrl,
                'primary_image_url' => $imageUrl,
                'primary_image' => $primaryImage instanceof EventImage ? new EventImageResource($primaryImage) : null,
                'banner_image' => $bannerImage instanceof EventImage ? new EventImageResource($bannerImage) : null,
                'gallery_images' => Profiler::section('HomepageEventResource EventImageResource collection create', fn () => EventImageResource::collection($galleryImages)),
                'category' => $this->category,
                'location' => [
                    'venue_name' => $this->venue_name,
                    'city' => $this->city,
                    'country' => $this->country,
                ],
                'venue_name' => $this->venue_name,
                'city' => $this->city,
                'country' => $this->country,
                'starts_at' => $this->starts_at,
                'timezone' => $this->timezone ?: 'Europe/Pristina',
                'price_from' => $priceFrom !== null ? (float) $priceFrom : null,
                'base_price' => $priceFrom !== null ? (float) $priceFrom : null,
                'currency' => $this->currency ?: 'USD',
                'status' => $this->status,
                'is_featured' => (bool) $this->is_featured,
                'is_trending' => (bool) $this->is_trending,
                'created_at' => $this->created_at,
            ]);
        });
    }
}
