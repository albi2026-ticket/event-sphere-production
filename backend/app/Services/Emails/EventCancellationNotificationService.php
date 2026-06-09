<?php

namespace App\Services\Emails;

use App\Mail\EventCancelledAdminMail;
use App\Mail\EventCancelledOrganizerMail;
use App\Mail\EventCancelledUserMail;
use App\Models\AuditLog;
use App\Models\Event;
use App\Models\Order;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class EventCancellationNotificationService
{
    private const EVENT_DISPLAY_TIMEZONE = 'Europe/Pristina';

    /**
     * @return array{sent: bool, user_notifications: int, admin_notifications: int, organizer_notified: bool, tickets_sold: int, revenue_generated: float}
     */
    public function send(Event $event, ?User $cancelledBy = null, ?string $ipAddress = null): array
    {
        $claimed = Event::query()
            ->whereKey($event->id)
            ->whereNull('cancellation_notifications_sent_at')
            ->update([
                'cancelled_at' => $event->cancelled_at ?: now(),
                'cancellation_notifications_sent_at' => now(),
            ]);

        if ($claimed !== 1) {
            return [
                'sent' => false,
                'user_notifications' => 0,
                'admin_notifications' => 0,
                'organizer_notified' => false,
                'tickets_sold' => 0,
                'revenue_generated' => 0.0,
            ];
        }

        $event = $event->fresh(['organizer']);
        $orders = $this->paidOrders($event);
        $eventItems = $orders->flatMap(fn (Order $order) => $order->items);
        $ticketsSold = (int) $eventItems->sum('quantity');
        $revenue = (float) $eventItems->sum('total');
        $cancelledAt = $event->cancelled_at ?: now();

        $userNotifications = 0;
        foreach ($orders as $order) {
            try {
                Mail::to($order->billing_email, $this->purchaserName($order))
                    ->send(new EventCancelledUserMail($event, $order, $this->eventData($event)));
                $userNotifications++;
            } catch (Throwable $exception) {
                $this->logFailure('Event cancellation user email failed.', $event, $exception, ['order_id' => $order->id]);
            }
        }

        $adminNotifications = 0;
        $adminData = $this->adminData($event, $ticketsSold, $revenue, $cancelledAt);
        foreach ($this->admins() as $admin) {
            try {
                Mail::to($admin->email, $admin->name)->send(new EventCancelledAdminMail($event, $adminData));
                $adminNotifications++;
            } catch (Throwable $exception) {
                $this->logFailure('Event cancellation admin email failed.', $event, $exception, ['admin_id' => $admin->id]);
            }
        }

        $organizerNotified = false;
        if ($event->organizer?->email) {
            try {
                Mail::to($event->organizer->email, $event->organizer->name)
                    ->send(new EventCancelledOrganizerMail($event, [
                        'ticket_holders_notified' => $userNotifications,
                        'cancelled_at' => $this->dateTimeLabel($cancelledAt),
                    ]));
                $organizerNotified = true;
            } catch (Throwable $exception) {
                $this->logFailure('Event cancellation organizer email failed.', $event, $exception, [
                    'organizer_id' => $event->organizer_id,
                ]);
            }
        }

        AuditLog::record($cancelledBy, 'event.cancelled', $event, [
            'title' => $event->title,
            'tickets_sold' => $ticketsSold,
            'revenue_generated' => $revenue,
            'user_notifications' => $userNotifications,
            'admin_notifications' => $adminNotifications,
            'organizer_notified' => $organizerNotified,
            'cancelled_at' => $cancelledAt->toIso8601String(),
        ], $ipAddress);

        return [
            'sent' => true,
            'user_notifications' => $userNotifications,
            'admin_notifications' => $adminNotifications,
            'organizer_notified' => $organizerNotified,
            'tickets_sold' => $ticketsSold,
            'revenue_generated' => $revenue,
        ];
    }

    /**
     * @return \Illuminate\Support\Collection<int, Order>
     */
    protected function paidOrders(Event $event)
    {
        return Order::query()
            ->with(['user', 'items' => fn ($query) => $query->where('event_id', $event->id)])
            ->where('payment_status', Order::PAYMENT_STATUS_PAID)
            ->whereHas('items', fn ($query) => $query->where('event_id', $event->id))
            ->orderBy('id')
            ->get();
    }

    /**
     * @return \Illuminate\Support\Collection<int, User>
     */
    protected function admins()
    {
        return User::query()
            ->where('role', User::ROLE_ADMIN)
            ->where('status', User::STATUS_ACTIVE)
            ->orderBy('id')
            ->get();
    }

    /**
     * @return array<string, mixed>
     */
    protected function eventData(Event $event): array
    {
        return [
            'event_date' => $this->eventDateLabel($event),
            'location' => $this->locationLabel($event),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function adminData(Event $event, int $ticketsSold, float $revenue, CarbonInterface $cancelledAt): array
    {
        return [
            'organizer_name' => $event->organizer?->name ?: 'Unknown organizer',
            'event_date' => $this->eventDateLabel($event),
            'tickets_sold' => $ticketsSold,
            'revenue_generated' => $this->money($revenue, $event->currency),
            'cancelled_at' => $this->dateTimeLabel($cancelledAt),
        ];
    }

    protected function purchaserName(Order $order): string
    {
        $name = trim($order->billing_first_name.' '.$order->billing_last_name);

        return $name !== '' ? $name : (string) ($order->user?->name ?: 'Event Sphere customer');
    }

    protected function eventDateLabel(Event $event): string
    {
        return $event->starts_at
            ? $event->starts_at->copy()->setTimezone($this->calculationTimezone($event->timezone))->format('M j, Y g:i A T')
            : 'Date to be announced';
    }

    protected function locationLabel(Event $event): string
    {
        $parts = array_filter([$event->venue_name, $event->address, $event->city, $event->country]);

        return $parts ? implode(', ', $parts) : 'Location to be announced';
    }

    protected function dateTimeLabel(CarbonInterface $date): string
    {
        return $date->copy()->setTimezone(config('app.timezone'))->format('M j, Y g:i A T');
    }

    protected function money(float $amount, ?string $currency): string
    {
        return strtoupper($currency ?: 'USD').' '.number_format($amount, 2);
    }

    protected function calculationTimezone(?string $timezone): string
    {
        $timezone = $timezone ?: self::EVENT_DISPLAY_TIMEZONE;

        return $timezone === self::EVENT_DISPLAY_TIMEZONE ? 'Europe/Belgrade' : $timezone;
    }

    /**
     * @param  array<string, mixed>  $context
     */
    protected function logFailure(string $message, Event $event, Throwable $exception, array $context = []): void
    {
        Log::warning($message, array_merge($context, [
            'event_id' => $event->id,
            'exception' => $exception::class,
            'message' => $exception->getMessage(),
        ]));
    }
}
