<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'venue_id',
    'user_id',
    'party_size',
    'reservation_date',
    'reservation_time',
    'reserved_at',
    'expires_at',
    'status',
])]
class ReservationHold extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_CANCELLED = 'cancelled';

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE && $this->expires_at?->isFuture();
    }

    protected function casts(): array
    {
        return [
            'party_size' => 'integer',
            'reservation_date' => 'date:Y-m-d',
            'reserved_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }
}
