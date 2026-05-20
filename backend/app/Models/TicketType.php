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
])]
class TicketType extends Model
{
    use HasFactory;

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
        ];
    }
}
