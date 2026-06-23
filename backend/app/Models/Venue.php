<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'name',
    'slug',
    'description',
    'venue_type',
    'phone',
    'email',
    'website',
    'address',
    'city',
    'country',
    'latitude',
    'longitude',
    'logo_image',
    'status',
    'featured',
    'min_guests',
    'max_guests',
    'reservation_interval_minutes',
    'last_reservation_time',
    'facebook_url',
    'instagram_url',
    'tiktok_url',
])]
class Venue extends Model
{
    use HasFactory;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';

    public const TYPE_RESTAURANT = 'restaurant';
    public const TYPE_BAR = 'bar';
    public const TYPE_LOUNGE = 'lounge';
    public const TYPE_CAFE = 'cafe';

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function scopePublicDiscovery(Builder $query): Builder
    {
        return $query
            ->where('status', self::STATUS_ACTIVE);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(VenueImage::class)->orderBy('sort_order')->orderBy('id');
    }

    public function facilities(): BelongsToMany
    {
        return $this->belongsToMany(VenueFacility::class, 'venue_facility', 'venue_id', 'facility_id')
            ->orderBy('name');
    }

    public function cuisineTypes(): BelongsToMany
    {
        return $this->belongsToMany(CuisineType::class, 'venue_cuisine')
            ->orderBy('name');
    }

    public function paymentOptions(): BelongsToMany
    {
        return $this->belongsToMany(PaymentOption::class, 'venue_payment_option')
            ->orderBy('name');
    }

    public function openingHours(): HasMany
    {
        return $this->hasMany(VenueOpeningHour::class)->orderBy('day_of_week');
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'featured' => 'boolean',
            'min_guests' => 'integer',
            'max_guests' => 'integer',
            'reservation_interval_minutes' => 'integer',
        ];
    }
}
