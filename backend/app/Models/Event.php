<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'organizer_id',
    'title',
    'slug',
    'category',
    'description',
    'venue_name',
    'city',
    'country',
    'address',
    'starts_at',
    'ends_at',
    'timezone',
    'status',
    'visibility',
    'banner_image_url',
    'base_price',
    'currency',
    'is_featured',
    'is_trending',
    'is_verified',
    'allow_resale',
    'refund_policy',
    'views_count',
])]
class Event extends Model
{
    use HasFactory, SoftDeletes;

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(EventImage::class);
    }

    public function ticketTypes(): HasMany
    {
        return $this->hasMany(TicketType::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'base_price' => 'decimal:2',
            'is_featured' => 'boolean',
            'is_trending' => 'boolean',
            'is_verified' => 'boolean',
            'allow_resale' => 'boolean',
            'views_count' => 'integer',
        ];
    }
}
