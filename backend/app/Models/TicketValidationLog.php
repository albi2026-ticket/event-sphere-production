<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'event_id',
    'ticket_id',
    'scanned_by',
    'result',
    'method',
    'scanned_at',
    'attendee_name',
    'attendee_email',
    'ticket_code',
    'ticket_uuid',
    'token_hash',
    'ip_address',
    'user_agent',
    'message',
])]
class TicketValidationLog extends Model
{
    use HasFactory;

    public const RESULT_VALID = 'valid';

    public const RESULT_ALREADY_USED = 'already_used';

    public const RESULT_INVALID = 'invalid';

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function scanner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scanned_by');
    }

    protected function casts(): array
    {
        return [
            'scanned_at' => 'datetime',
        ];
    }
}
