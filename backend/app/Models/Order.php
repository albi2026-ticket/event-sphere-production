<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'order_number',
    'status',
    'payment_status',
    'subtotal',
    'service_fee',
    'refund_protection_fee',
    'discount_total',
    'tax_total',
    'total',
    'currency',
    'promo_code',
    'payment_provider',
    'payment_reference',
    'billing_email',
    'billing_phone',
    'billing_first_name',
    'billing_last_name',
    'billing_address',
    'billing_city',
    'billing_state',
    'billing_zip',
    'billing_country',
    'fraud_score',
    'fraud_status',
    'paid_at',
    'cancelled_at',
    'refunded_at',
])]
class Order extends Model
{
    use HasFactory;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'service_fee' => 'decimal:2',
            'refund_protection_fee' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'total' => 'decimal:2',
            'fraud_score' => 'integer',
            'paid_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'refunded_at' => 'datetime',
        ];
    }
}
