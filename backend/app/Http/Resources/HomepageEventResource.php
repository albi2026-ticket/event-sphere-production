<?php

namespace App\Http\Resources;

use App\Models\EventImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HomepageEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $primaryImage = $this->whenLoaded('images', fn () => $this->images->firstWhere('is_primary', true) ?? $this->images->first());
        $imageUrl = $primaryImage instanceof EventImage
            ? $primaryImage->publicUrl()
            : $this->banner_image_url;
        $priceFrom = $this->price_from ?? $this->base_price;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'image' => $imageUrl,
            'banner_image_url' => $imageUrl,
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
        ];
    }
}
