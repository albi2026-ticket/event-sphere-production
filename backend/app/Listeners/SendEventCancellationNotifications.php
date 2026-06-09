<?php

namespace App\Listeners;

use App\Events\EventCancelled;
use App\Services\Emails\EventCancellationNotificationService;

class SendEventCancellationNotifications
{
    public function __construct(private readonly EventCancellationNotificationService $notifications) {}

    public function handle(EventCancelled $event): void
    {
        $this->notifications->send($event->event, $event->cancelledBy, $event->ipAddress);
    }
}
