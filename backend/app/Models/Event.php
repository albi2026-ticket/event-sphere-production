<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
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
    'max_tickets_per_user',
    'service_fee_percentage',
    'base_price',
    'currency',
    'is_featured',
    'is_trending',
    'is_verified',
    'allow_resale',
    'refund_policy',
    'moderation_notes',
    'views_count',
])]
class Event extends Model
{
    use HasFactory, SoftDeletes;

    public function salesAreClosed(): bool
    {
        if (in_array($this->status, ['cancelled', 'completed'], true)) {
            return true;
        }

        return $this->ends_at !== null && now()->gt($this->ends_at);
    }

    public function scopeNotEnded(Builder $query): Builder
    {
        return $query
            ->whereNotIn('events.status', ['cancelled', 'completed'])
            ->where(function (Builder $query): void {
                $query->whereNull('events.ends_at')
                    ->orWhere('events.ends_at', '>=', now());
            });
    }

    public function scopePublicDiscovery(Builder $query): Builder
    {
        return $query
            ->where('events.status', 'published')
            ->where('events.visibility', 'public')
            ->notEnded();
    }

    public function scopeWithDiscoveryMetrics(Builder $query): Builder
    {
        return $query
            ->withSum([
                'orderItems as tickets_sold_count' => fn (Builder $query) => $query
                    ->whereHas('order', fn (Builder $query) => $query->where('payment_status', Order::PAYMENT_STATUS_PAID)),
            ], 'quantity')
            ->withSum([
                'orderItems as recent_tickets_sold_count' => fn (Builder $query) => $query
                    ->where('created_at', '>=', now()->subDays(7))
                    ->whereHas('order', fn (Builder $query) => $query->where('payment_status', Order::PAYMENT_STATUS_PAID)),
            ], 'quantity');
    }

    public function lifecycleState(int $availableInventory): array
    {
        if ($this->salesAreClosed()) {
            return ['key' => 'ended', 'label' => 'Ended'];
        }

        if ($this->status !== 'published') {
            return ['key' => 'draft', 'label' => 'Draft'];
        }

        if ($availableInventory <= 0) {
            return ['key' => 'sold_out', 'label' => 'Sold Out'];
        }

        if ($this->starts_at && now()->gte($this->starts_at)) {
            return ['key' => 'live', 'label' => 'Live'];
        }

        return ['key' => 'upcoming', 'label' => 'Upcoming'];
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(EventImage::class)
            ->orderByDesc('is_primary')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function ticketTypes(): HasMany
    {
        return $this->hasMany(TicketType::class)->orderBy('sort_order')->orderBy('price');
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
            'max_tickets_per_user' => 'integer',
            'service_fee_percentage' => 'decimal:2',
            'base_price' => 'decimal:2',
            'is_featured' => 'boolean',
            'is_trending' => 'boolean',
            'is_verified' => 'boolean',
            'allow_resale' => 'boolean',
            'views_count' => 'integer',
        ];
    }
}
