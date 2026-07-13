<?php

namespace App\Services\Notifications;

use App\Models\Event;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Ticket;
use App\Models\User;

class NotificationService
{
    public function create(User $user, string $type, string $title, string $message, ?string $link = null): Notification
    {
        return Notification::query()->create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'link' => $link,
            'is_read' => false,
        ]);
    }

    public function ticketPurchased(Order $order): void
    {
        $order->loadMissing(['user', 'items.event']);

        if (! $order->user) {
            return;
        }

        $order->items
            ->pluck('event')
            ->filter()
            ->unique('id')
            ->each(function (Event $event) use ($order): void {
                $this->create(
                    $order->user,
                    Notification::TYPE_TICKET_PURCHASED,
                    $this->tr($order->user, 'notifications.ticket_purchased'),
                    $this->tr($order->user, 'notifications.ticket_purchased_message', ['event' => $event->title]),
                    $this->eventLink($event),
                );
            });
    }

    public function ticketRefunded(Order $order): void
    {
        $order->loadMissing(['tickets.user', 'tickets.event']);

        $order->tickets
            ->filter(fn (Ticket $ticket): bool => $ticket->user !== null && $ticket->event !== null)
            ->unique(fn (Ticket $ticket): string => $ticket->user_id.'-'.$ticket->event_id)
            ->each(function (Ticket $ticket): void {
                $this->create(
                    $ticket->user,
                    Notification::TYPE_TICKET_REFUNDED,
                    $this->tr($ticket->user, 'notifications.ticket_refunded'),
                    $this->tr($ticket->user, 'notifications.ticket_refunded_message', ['event' => $ticket->event->title]),
                    $this->eventLink($ticket->event),
                );
            });
    }

    public function eventApproved(Event $event): void
    {
        $event->loadMissing('organizer');

        if (! $event->organizer) {
            return;
        }

        $this->create(
            $event->organizer,
            Notification::TYPE_EVENT_APPROVED,
            $this->tr($event->organizer, 'notifications.event_approved'),
            $this->tr($event->organizer, 'notifications.event_approved_message', ['event' => $event->title]),
            'organizer.html',
        );
    }

    public function eventRejected(Event $event, ?string $reason = null): void
    {
        $event->loadMissing('organizer');

        if (! $event->organizer) {
            return;
        }

        $message = $this->tr($event->organizer, 'notifications.event_rejected_message', ['event' => $event->title]);
        if ($reason) {
            $message .= ' '.$this->tr($event->organizer, 'notifications.event_rejected_reason', ['reason' => $reason]);
        }

        $this->create(
            $event->organizer,
            Notification::TYPE_EVENT_REJECTED,
            $this->tr($event->organizer, 'notifications.event_rejected'),
            $message,
            'organizer.html',
        );
    }

    public function eventUpdated(Event $event): void
    {
        $this->ticketHolders($event)->each(function (User $user) use ($event): void {
            $this->create(
                $user,
                Notification::TYPE_EVENT_UPDATED,
                $this->tr($user, 'notifications.event_updated'),
                $this->tr($user, 'notifications.event_updated_message', ['event' => $event->title]),
                $this->eventLink($event),
            );
        });
    }

    public function eventCancelled(Event $event): void
    {
        $this->ticketHolders($event)->each(function (User $user) use ($event): void {
            $this->create(
                $user,
                Notification::TYPE_EVENT_CANCELLED,
                $this->tr($user, 'notifications.event_cancelled'),
                $this->tr($user, 'notifications.event_cancelled_message', ['event' => $event->title]),
                $this->eventLink($event),
            );
        });
    }

    protected function ticketHolders(Event $event)
    {
        return User::query()
            ->whereHas('tickets', fn ($query) => $query->where('event_id', $event->id))
            ->where('role', User::ROLE_USER)
            ->where('status', User::STATUS_ACTIVE)
            ->orderBy('id')
            ->get();
    }

    protected function eventLink(Event $event): string
    {
        return "event-details.html?id={$event->id}";
    }

    /**
     * @param array<string, mixed> $replace
     */
    protected function tr(User $user, string $key, array $replace = []): string
    {
        return __($key, $replace, $user->preferred_language ?: 'en');
    }
}
