<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'ticket_code',
    'qr_token',
    'user_id',
    'event_id',
    'ticket_type_id',
    'order_id',
    'order_item_id',
    'seat_label',
    'status',
    'transfer_status',
    'checked_in_at',
    'checked_in_by',
    'transferred_to_user_id',
    'transferred_at',
])]
class Ticket extends Model
{
    use HasFactory;

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

    protected function casts(): array
    {
        return [
            'checked_in_at' => 'datetime',
            'transferred_at' => 'datetime',
        ];
    }
}
