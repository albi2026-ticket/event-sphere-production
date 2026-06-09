<?php

namespace App\Services\Emails;

use App\Mail\OrderConfirmationMail;
use App\Models\Order;
use App\Support\AppUrls;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Throwable;

class OrderEmailService
{
    private const EVENT_DISPLAY_TIMEZONE = 'Europe/Pristina';

    private const EVENT_CALCULATION_TIMEZONE = 'Europe/Belgrade';

    public const TYPE_ORDER_CONFIRMATION = 'order_confirmation';

    public const TYPE_EVENT_REMINDER = 'event_reminder';

    public const TYPE_EVENT_UPDATED = 'event_updated';

    public const TYPE_EVENT_CANCELLED = 'event_cancelled';

    public function sendOrderConfirmation(Order $order): bool
    {
        if ($order->payment_status !== Order::PAYMENT_STATUS_PAID) {
            return false;
        }

        $claimed = Order::query()
            ->whereKey($order->id)
            ->where('payment_status', Order::PAYMENT_STATUS_PAID)
            ->whereNull('order_confirmation_email_sent_at')
            ->update(['order_confirmation_email_sent_at' => now()]);

        if ($claimed !== 1) {
            return false;
        }

        $order = $order->fresh([
            'user',
            'items.event',
            'items.ticketType',
            'tickets' => fn ($query) => $query->orderBy('order_item_id')->orderBy('id'),
            'tickets.event',
            'tickets.ticketType',
        ]);

        try {
            Mail::to($order->billing_email, $this->purchaserName($order))
                ->send(new OrderConfirmationMail($order, $this->emailData($order)));
        } catch (Throwable $exception) {
            Order::query()
                ->whereKey($order->id)
                ->update(['order_confirmation_email_sent_at' => null]);

            Log::warning('Order confirmation email failed.', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            return false;
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    protected function emailData(Order $order): array
    {
        $dashboardUrl = AppUrls::frontend('/site/dashboard.html#tickets');

        return [
            'brand' => 'Event Sphere',
            'purchaser_name' => $this->purchaserName($order),
            'purchaser_email' => $order->billing_email,
            'purchase_date' => $this->dateTimeLabel($order->paid_at ?: $order->created_at),
            'my_tickets_url' => $dashboardUrl,
            'items' => $order->items->map(fn ($item): array => [
                'event_name' => $item->event_title ?: $item->event?->title,
                'event_date' => $this->eventDateLabel($item),
                'event_time' => $this->eventTimeLabel($item),
                'timezone_label' => $this->timezoneLabel($item),
                'venue' => $this->venueLabel($item),
                'ticket_type' => $item->ticket_type_name ?: $item->ticketType?->name,
                'quantity' => $item->quantity,
                'price_per_ticket' => $this->money($item->unit_price, $order->currency),
                'service_fee' => $this->money($item->service_fee, $order->currency),
                'total_paid' => $this->money($item->total, $order->currency),
                'attendees' => $this->attendeesForItem($order, $item->id),
            ])->values()->all(),
            'tickets' => $order->tickets->map(fn ($ticket): array => [
                'code' => $ticket->ticket_code,
                'attendee_name' => $ticket->attendee_name ?: $order->user?->name ?: $this->purchaserName($order),
                'attendee_email' => $ticket->attendee_email ?: $order->user?->email ?: $order->billing_email,
                'ticket_type' => $ticket->ticketType?->name,
                'event_name' => $ticket->event?->title,
                'qr_url' => $this->signedTicketUrl('tickets.email.qr-code', $ticket->id),
                'download_url' => $this->signedTicketUrl('tickets.email.download', $ticket->id),
                'has_qr' => (bool) $ticket->qr_token,
            ])->values()->all(),
            'has_qr_tickets' => $order->tickets->contains(fn ($ticket): bool => (bool) $ticket->qr_token),
        ];
    }

    protected function signedTicketUrl(string $routeName, int $ticketId): string
    {
        return URL::temporarySignedRoute(
            $routeName,
            now()->addDays((int) config('services.tickets.email_link_expiration_days', 30)),
            ['ticket' => $ticketId],
        );
    }

    protected function purchaserName(Order $order): string
    {
        $name = trim($order->billing_first_name.' '.$order->billing_last_name);

        return $name !== '' ? $name : (string) ($order->user?->name ?: 'Event Sphere customer');
    }

    /**
     * @return array<int, array{name: string, email: ?string}>
     */
    protected function attendeesForItem(Order $order, int $itemId): array
    {
        $tickets = $order->tickets->where('order_item_id', $itemId);

        if ($tickets->isNotEmpty()) {
            return $tickets->map(fn ($ticket): array => [
                'name' => $ticket->attendee_name ?: $order->user?->name ?: $this->purchaserName($order),
                'email' => $ticket->attendee_email ?: $order->user?->email ?: $order->billing_email,
            ])->values()->all();
        }

        $item = $order->items->firstWhere('id', $itemId);

        return collect($item?->attendee_details ?: [])->map(fn (array $attendee): array => [
            'name' => $attendee['name'] ?: $this->purchaserName($order),
            'email' => $attendee['email'] ?: null,
        ])->values()->all();
    }

    protected function eventDateLabel($item): string
    {
        $date = $this->eventDate($item);

        return $date?->format('M j, Y') ?: 'Date to be announced';
    }

    protected function eventTimeLabel($item): string
    {
        $date = $this->eventDate($item);

        return $date?->format('g:i A') ?: 'Time to be announced';
    }

    protected function timezoneLabel($item): string
    {
        $date = $this->eventDate($item);
        $timezone = $this->displayTimezoneLabel($item->event?->timezone);

        if (! $date) {
            return $timezone;
        }

        $offset = $date->format('P');
        $offset = str_replace(':00', '', $offset);
        $offset = preg_replace('/^([+-])0(\d)$/', '$1$2', $offset) ?: $offset;

        return 'UTC'.$offset.' / '.$timezone;
    }

    protected function venueLabel($item): string
    {
        $event = $item->event;
        $parts = array_filter([
            $event?->venue_name,
            $event?->address,
            $event?->city,
            $event?->country,
        ]);

        return $parts ? implode(', ', $parts) : 'Venue to be announced';
    }

    protected function eventDate($item): ?CarbonInterface
    {
        $date = $item->event?->starts_at ?: $item->event_starts_at;

        return $date ? $date->copy()->setTimezone($this->calculationTimezone($item->event?->timezone)) : null;
    }

    protected function dateTimeLabel(?CarbonInterface $date): string
    {
        return $date?->copy()->setTimezone(config('app.timezone'))->format('M j, Y g:i A T') ?: 'Not available';
    }

    protected function money(mixed $amount, ?string $currency): string
    {
        return strtoupper($currency ?: 'USD').' '.number_format((float) $amount, 2);
    }

    protected function displayTimezone(?string $timezone): string
    {
        return $timezone ?: self::EVENT_DISPLAY_TIMEZONE;
    }

    protected function calculationTimezone(?string $timezone): string
    {
        $timezone = $this->displayTimezone($timezone);

        return $timezone === self::EVENT_DISPLAY_TIMEZONE
            ? self::EVENT_CALCULATION_TIMEZONE
            : $timezone;
    }

    protected function displayTimezoneLabel(?string $timezone): string
    {
        $timezone = $this->displayTimezone($timezone);

        return $timezone === self::EVENT_DISPLAY_TIMEZONE ? 'Europe-Pristina' : $timezone;
    }
}
