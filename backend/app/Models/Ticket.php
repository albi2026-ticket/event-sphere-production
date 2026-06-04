<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'ticket_uuid',
    'ticket_code',
    'qr_token',
    'qr_payload',
    'user_id',
    'event_id',
    'ticket_type_id',
    'order_id',
    'order_item_id',
    'seat_label',
    'attendee_name',
    'attendee_email',
    'attendee_phone',
    'status',
    'transfer_status',
    'checked_in_at',
    'checked_in_by',
    'checked_in_method',
    'checked_in_notes',
    'issued_at',
    'transferred_to_user_id',
    'transferred_at',
    'downloaded_at',
    'download_count',
])]
class Ticket extends Model
{
    use HasFactory;

    public const STATUS_VALID = 'valid';

    public const STATUS_CHECKED_IN = 'checked_in';

    public const STATUS_ACTIVE = self::STATUS_VALID;

    public const STATUS_USED = self::STATUS_CHECKED_IN;

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_REFUNDED = 'refunded';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function ticketType(): BelongsTo
    {
        return $this->belongsTo(TicketType::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function checkedInBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }

    public function transferredToUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'transferred_to_user_id');
    }

    public function validationLogs(): HasMany
    {
        return $this->hasMany(TicketValidationLog::class);
    }

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
            'checked_in_at' => 'datetime',
            'transferred_at' => 'datetime',
            'downloaded_at' => 'datetime',
            'download_count' => 'integer',
        ];
    }
}
