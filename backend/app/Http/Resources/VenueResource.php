<?php

namespace App\Http\Resources;

use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VenueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return Profiler::section('VenueResource::toArray', function (): array {
            $imageUrl = Profiler::section('VenueResource image sort/first/publicUrl', fn () => $this->relationLoaded('images')
            ? $this->images->sortBy('sort_order')->first()?->publicUrl()
            : null);
            $lastReservationTime = Profiler::section('VenueResource formatTime helper', fn (): ?string => $this->formatTime($this->last_reservation_time));

            return Profiler::section('VenueResource payload array build', fn (): array => [
                'id' => $this->id,
                'user_id' => $this->user_id,
                'owner' => $this->whenLoaded('owner', fn () => Profiler::section('VenueResource owner transform', fn (): array => [
                    'id' => $this->owner->id,
                    'name' => $this->owner->name,
                    'email' => $this->owner->email,
                    'status' => $this->owner->status,
                    'role' => $this->owner->role,
                    'organizer_status' => $this->owner->organizer_status,
                ])),
                'name' => $this->name,
                'slug' => $this->slug,
                'description' => $this->description,
                'venue_type' => $this->venue_type,
                'phone' => $this->phone,
                'email' => $this->email,
                'website' => $this->website,
                'address' => $this->address,
                'city' => $this->city,
                'country' => $this->country,
                'latitude' => $this->latitude,
                'longitude' => $this->longitude,
                'logo_image' => $this->logo_image,
                'image_url' => $imageUrl,
                'status' => $this->status,
                'featured' => $this->featured,
                'images' => Profiler::section('VenueResource images collection create', fn () => VenueImageResource::collection($this->whenLoaded('images'))),
                'facilities' => Profiler::section('VenueResource facilities collection create', fn () => VenueFacilityResource::collection($this->whenLoaded('facilities'))),
                'cuisine_types' => Profiler::section('VenueResource cuisineTypes collection create', fn () => CuisineTypeResource::collection($this->whenLoaded('cuisineTypes'))),
                'payment_options' => Profiler::section('VenueResource paymentOptions collection create', fn () => PaymentOptionResource::collection($this->whenLoaded('paymentOptions'))),
                'opening_hours' => Profiler::section('VenueResource openingHours collection create', fn () => VenueOpeningHourResource::collection($this->whenLoaded('openingHours'))),
                'special_hours' => Profiler::section('VenueResource specialHours collection create', fn () => VenueSpecialHourResource::collection($this->whenLoaded('specialHours'))),
                'blackout_dates' => Profiler::section('VenueResource blackoutDates collection create', fn () => VenueBlackoutDateResource::collection($this->whenLoaded('blackoutDates'))),
                'reservation_settings' => [
                    'min_guests' => $this->min_guests,
                    'max_guests' => $this->max_guests,
                    'reservation_interval_minutes' => $this->reservation_interval_minutes,
                    'max_reservations_per_slot' => $this->max_reservations_per_slot,
                    'booking_horizon_days' => $this->booking_horizon_days,
                    'last_reservation_time' => $lastReservationTime,
                ],
                'social_links' => [
                    'facebook_url' => $this->facebook_url,
                    'instagram_url' => $this->instagram_url,
                    'tiktok_url' => $this->tiktok_url,
                ],
                'reservations_count' => $this->whenCounted('reservations'),
                'created_at' => $this->created_at,
                'updated_at' => $this->updated_at,
            ]);
        });
    }

    protected function formatTime(mixed $value): ?string
    {
        if (! $value) {
            return null;
        }

        return substr((string) $value, 0, 5);
    }
}
