<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'recipient_name',
    'recipient_email',
    'email_type',
    'module',
    'subject',
    'status',
    'mailable_class',
    'sent_at',
    'related_user_id',
    'related_event_id',
    'related_reservation_id',
    'related_order_id',
])]
class EmailLog extends Model
{
    public const STATUS_PENDING = 'Pending';
    public const STATUS_SUCCESS = 'Success';
    public const STATUS_FAILED = 'Failed';

    public const MODULE_RESERVATIONS = 'Reservations';
    public const MODULE_EVENTS = 'Events';
    public const MODULE_SYSTEM = 'System';
    public const MODULE_ORGANIZER = 'Organizer';
    public const MODULE_OWNER = 'Owner';
    public const MODULE_USER = 'User';

    public function relatedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'related_user_id');
    }

    public function relatedEvent(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'related_event_id');
    }

    public function relatedReservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class, 'related_reservation_id');
    }

    public function relatedOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'related_order_id');
    }

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
        ];
    }
}
