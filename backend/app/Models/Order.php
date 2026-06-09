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
    'discount_total',
    'tax_total',
    'total',
    'currency',
    'promo_code',
    'payment_provider',
    'payment_reference',
    'stripe_checkout_session_id',
    'stripe_payment_intent_id',
    'stripe_refund_id',
    'stripe_payment_status',
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
    'order_confirmation_email_sent_at',
    'cancelled_at',
    'refunded_at',
    'checkout_expires_at',
    'checkout_reservation_id',
])]
class Order extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_PAID = 'paid';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_REFUNDED = 'refunded';

    public const PAYMENT_STATUS_UNPAID = 'unpaid';

    public const PAYMENT_STATUS_PENDING = 'pending';

    public const PAYMENT_STATUS_PAID = 'paid';

    public const PAYMENT_STATUS_FAILED = 'failed';

    public const PAYMENT_STATUS_CANCELLED = 'cancelled';

    public const PAYMENT_STATUS_REFUNDED = 'refunded';

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

    public function checkoutReservation(): BelongsTo
    {
        return $this->belongsTo(CheckoutReservation::class);
    }

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'service_fee' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'total' => 'decimal:2',
            'fraud_score' => 'integer',
            'paid_at' => 'datetime',
            'order_confirmation_email_sent_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'refunded_at' => 'datetime',
            'checkout_expires_at' => 'datetime',
        ];
    }
}
