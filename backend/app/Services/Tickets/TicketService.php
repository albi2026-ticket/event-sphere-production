<?php

namespace App\Services\Tickets;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Ticket;
use App\Models\User;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\Writer\SvgWriter;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TicketService
{
    /**
     * @return array<int, Ticket>
     */
    public function generateForPaidOrder(Order $order): array
    {
        return DB::transaction(function () use ($order): array {
            $order->loadMissing(['user', 'items.ticketType', 'items.event']);
            $tickets = [];

            foreach ($order->items as $item) {
                $tickets = array_merge($tickets, $this->generateForOrderItem($order, $item));
            }

            return $tickets;
        });
    }

    /**
     * @return array<int, Ticket>
     */
    public function generateForOrderItem(Order $order, OrderItem $item): array
    {
        $existing = $item->tickets()->count();
        $attendees = $item->attendee_details ?: [];
        $tickets = [];

        for ($i = $existing; $i < $item->quantity; $i++) {
            $attendee = $attendees[$i] ?? [
                'name' => $order->user?->name,
                'email' => $order->user?->email ?: $order->billing_email,
                'phone' => $order->user?->phone ?: $order->billing_phone,
            ];
            $token = $this->newQrToken();
            $ticket = Ticket::query()->create([
                'ticket_code' => $this->newTicketCode(),
                'qr_token' => $token,
                'qr_payload' => $this->qrPayload($token),
                'user_id' => $order->user_id,
                'event_id' => $item->event_id,
                'ticket_type_id' => $item->ticket_type_id,
                'order_id' => $order->id,
                'order_item_id' => $item->id,
                'attendee_name' => $attendee['name'] ?? null,
                'attendee_email' => $attendee['email'] ?? null,
                'attendee_phone' => $attendee['phone'] ?? null,
                'status' => Ticket::STATUS_ACTIVE,
            ]);

            $tickets[] = $ticket;
        }

        return $tickets;
    }

    public function findByScannerPayload(?string $token, ?string $ticketCode = null): Ticket
    {
        $ticket = Ticket::query()
            ->with(['user', 'event.organizer', 'ticketType', 'order.user'])
            ->when($token, fn (EloquentBuilder $query) => $query->where('qr_token', $token))
            ->when(! $token && $ticketCode, fn (EloquentBuilder $query) => $query->where('ticket_code', $ticketCode))
            ->first();

        if (! $ticket) {
            throw ValidationException::withMessages([
                'ticket' => 'Ticket could not be found.',
            ]);
        }

        return $ticket;
    }

    public function validationResult(Ticket $ticket): array
    {
        return [
            'is_valid' => $ticket->status === Ticket::STATUS_ACTIVE,
            'can_check_in' => $ticket->status === Ticket::STATUS_ACTIVE,
            'reason' => match ($ticket->status) {
                Ticket::STATUS_ACTIVE => 'Ticket is active and ready for check-in.',
                Ticket::STATUS_USED => 'Ticket has already been checked in.',
                Ticket::STATUS_CANCELLED => 'Ticket was cancelled.',
                Ticket::STATUS_REFUNDED => 'Ticket was refunded.',
                default => 'Ticket is not valid for check-in.',
            },
            'ticket_status' => $ticket->status,
            'checked_in_at' => $ticket->checked_in_at,
        ];
    }

    public function checkIn(Ticket $ticket, User $checker, ?string $method = 'manual', ?string $notes = null): Ticket
    {
        return DB::transaction(function () use ($ticket, $checker, $method, $notes): Ticket {
            $locked = Ticket::query()
                ->with(['user', 'event.organizer', 'ticketType', 'order.user'])
                ->whereKey($ticket->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== Ticket::STATUS_ACTIVE) {
                throw ValidationException::withMessages([
                    'ticket' => $this->validationResult($locked)['reason'],
                ]);
            }

            $locked->forceFill([
                'status' => Ticket::STATUS_USED,
                'checked_in_at' => now(),
                'checked_in_by' => $checker->id,
                'checked_in_method' => $method ?: 'manual',
                'checked_in_notes' => $notes,
            ])->save();

            return $locked->fresh(['user', 'event.organizer', 'ticketType', 'order.user']);
        });
    }

    public function markOrderTickets(Order $order, string $status): int
    {
        return Ticket::query()
            ->where('order_id', $order->id)
            ->where('status', '!=', Ticket::STATUS_USED)
            ->update(['status' => $status]);
    }

    public function markDownloaded(Ticket $ticket): void
    {
        $ticket->forceFill([
            'downloaded_at' => now(),
            'download_count' => $ticket->download_count + 1,
        ])->save();
    }

    public function qrPayload(string $token): string
    {
        return json_encode([
            'type' => 'event_sphere_ticket',
            'version' => 1,
            'token' => $token,
            'validation_url' => url('/api/tickets/validate'),
        ], JSON_THROW_ON_ERROR);
    }

    public function qrSvg(Ticket $ticket, int $size = 320): string
    {
        $payload = $ticket->qr_payload ?: $this->qrPayload($ticket->qr_token);

        return (new Builder(
            writer: new SvgWriter,
            writerOptions: [SvgWriter::WRITER_OPTION_EXCLUDE_XML_DECLARATION => true],
            data: $payload,
            errorCorrectionLevel: ErrorCorrectionLevel::High,
            size: $size,
            margin: 12,
        ))->build()->getString();
    }

    public function qrDataUri(Ticket $ticket, int $size = 320): string
    {
        $payload = $ticket->qr_payload ?: $this->qrPayload($ticket->qr_token);

        return (new Builder(
            writer: new SvgWriter,
            writerOptions: [SvgWriter::WRITER_OPTION_EXCLUDE_XML_DECLARATION => true],
            data: $payload,
            errorCorrectionLevel: ErrorCorrectionLevel::High,
            size: $size,
            margin: 12,
        ))->build()->getDataUri();
    }

    public function downloadHtml(Ticket $ticket): string
    {
        $ticket->loadMissing(['user', 'event', 'ticketType', 'order']);
        $qr = $this->qrDataUri($ticket, 280);
        $attendeeName = $ticket->attendee_name ?: $ticket->user->name;
        $attendeeEmail = $ticket->attendee_email ?: $ticket->user->email;

        return '<!doctype html><html><head><meta charset="utf-8"><title>Ticket '.$ticket->ticket_code.'</title></head><body style="font-family:Arial,sans-serif;margin:32px;color:#111827;">'
            .'<main style="max-width:720px;margin:0 auto;border:1px solid #d1d5db;padding:28px;border-radius:8px;">'
            .'<p style="text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin:0 0 8px;">Event Sphere Digital Ticket</p>'
            .'<h1 style="margin:0 0 8px;font-size:28px;">'.e($ticket->event->title).'</h1>'
            .'<p style="margin:0 0 20px;color:#374151;">'.e($ticket->event->venue_name).' · '.e($ticket->event->city).'</p>'
            .'<img src="'.$qr.'" alt="Ticket QR code" style="width:280px;height:280px;display:block;margin:0 0 20px;">'
            .'<p><strong>Ticket code:</strong> '.e($ticket->ticket_code).'</p>'
            .'<p><strong>Ticket type:</strong> '.e($ticket->ticketType->name).'</p>'
            .'<p><strong>Attendee:</strong> '.e($attendeeName).' · '.e($attendeeEmail).'</p>'
            .'<p><strong>Purchased by:</strong> '.e($ticket->user->name).' · '.e($ticket->user->email).'</p>'
            .'<p><strong>Status:</strong> '.e($ticket->status).'</p>'
            .'<p style="color:#6b7280;font-size:13px;">Present this QR code at check-in. Screenshots and downloads are valid until the ticket is used, cancelled, or refunded.</p>'
            .'</main></body></html>';
    }

    protected function newTicketCode(): string
    {
        do {
            $code = 'ES-'.Str::upper(Str::random(14));
        } while (Ticket::query()->where('ticket_code', $code)->exists());

        return $code;
    }

    protected function newQrToken(): string
    {
        do {
            $token = Str::random(48);
        } while (Ticket::query()->where('qr_token', $token)->exists());

        return $token;
    }
}
