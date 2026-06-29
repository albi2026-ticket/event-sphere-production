<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'type', 'title', 'message', 'link', 'is_read'])]
class Notification extends Model
{
    public const TYPE_RESERVATION_CREATED = 'reservation_created';
    public const TYPE_RESERVATION_CONFIRMED = 'reservation_confirmed';
    public const TYPE_RESERVATION_CANCELLED = 'reservation_cancelled';
    public const TYPE_RESERVATION_CANCELLED_BY_USER = 'reservation_cancelled_by_user';
    public const TYPE_RESERVATION_COMPLETED = 'reservation_completed';
    public const TYPE_RESERVATION_NO_SHOW = 'reservation_no_show';
    public const TYPE_TICKET_PURCHASED = 'ticket_purchased';
    public const TYPE_TICKET_REFUNDED = 'ticket_refunded';
    public const TYPE_NEW_TICKET_SALE = 'new_ticket_sale';
    public const TYPE_VENUE_CREATED = 'venue_created';
    public const TYPE_VENUE_DEACTIVATED = 'venue_deactivated';
    public const TYPE_EVENT_APPROVED = 'event_approved';
    public const TYPE_EVENT_REJECTED = 'event_rejected';
    public const TYPE_EVENT_UPDATED = 'event_updated';
    public const TYPE_EVENT_CANCELLED = 'event_cancelled';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function isUnread(): Attribute
    {
        return Attribute::get(fn (): bool => ! $this->is_read);
    }

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
        ];
    }
}
