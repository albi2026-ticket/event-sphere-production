<?php

namespace App\Events;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EventCancelled
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Event $event,
        public readonly ?User $cancelledBy = null,
        public readonly ?string $ipAddress = null,
    ) {}
}
