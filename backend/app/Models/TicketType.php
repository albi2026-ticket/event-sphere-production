<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'event_id',
    'name',
    'description',
    'price',
    'currency',
    'quantity_total',
    'quantity_sold',
    'quantity_reserved',
    'min_per_order',
    'max_per_order',
    'sale_starts_at',
    'sale_ends_at',
    'status',
    'is_vip',
    'is_resale_allowed',
    'sort_order',
])]
class TicketType extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';
    public const STATUS_PAUSED = 'paused';
    public const STATUS_SOLD_OUT = 'sold_out';

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'quantity_total' => 'integer',
            'quantity_sold' => 'integer',
            'quantity_reserved' => 'integer',
            'min_per_order' => 'integer',
            'max_per_order' => 'integer',
            'sale_starts_at' => 'datetime',
            'sale_ends_at' => 'datetime',
            'is_vip' => 'boolean',
            'is_resale_allowed' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function availableQuantity(): int
    {
        return max(0, $this->quantity_total - $this->quantity_sold - $this->quantity_reserved);
    }

    public function isOnSale(): bool
    {
        $now = now();

        return $this->status === self::STATUS_ACTIVE
            && (! $this->sale_starts_at || $this->sale_starts_at->lte($now))
            && (! $this->sale_ends_at || $this->sale_ends_at->gte($now));
    }

    public function isAvailableForPurchase(int $quantity = 1): bool
    {
        return $this->isOnSale()
            && $quantity >= $this->min_per_order
            && $quantity <= $this->max_per_order
            && $this->availableQuantity() >= $quantity;
    }
}
