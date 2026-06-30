<?php

namespace App\Listeners;

use App\Mail\EventCancelledAdminMail;
use App\Mail\EventCancelledOrganizerMail;
use App\Mail\EventCancelledUserMail;
use App\Mail\AdminRetriedEmail;
use App\Mail\NewReservationReceivedMail;
use App\Mail\OrderConfirmationMail;
use App\Mail\OrganizerTicketSaleMail;
use App\Mail\ReservationCancelledByGuestMail;
use App\Mail\ReservationCancelledMail;
use App\Mail\ReservationCompletedMail;
use App\Mail\ReservationConfirmedMail;
use App\Mail\ReservationNoShowMail;
use App\Mail\ReservationRequestReceivedMail;
use App\Models\EmailLog;
use App\Models\Event;
use App\Models\Order;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

class LogOutgoingEmail
{
    private const LOG_IDS_HEADER = 'X-Event-Sphere-Email-Log-Ids';

    /**
     * @var array<int, array<int, int>>
     */
    private array $pendingByMessage = [];

    public function handleSending(MessageSending $event): void
    {
        if (! Schema::hasTable('email_logs')) {
            return;
        }

        if ($this->logIdsFromMessage($event->message) !== []) {
            return;
        }

        $ids = [];
        $meta = $this->metadata($event->data, $event->message);
        $subject = $event->message->getSubject() ?: $meta['email_type'];

        foreach ($event->message->getTo() as $recipient) {
            $log = EmailLog::create(array_merge($meta, [
                'recipient_name' => $recipient->getName() ?: null,
                'recipient_email' => $recipient->getAddress(),
                'subject' => $subject,
                'status' => EmailLog::STATUS_PENDING,
                'html_body' => $event->message->getHtmlBody(),
                'text_body' => $event->message->getTextBody(),
            ]));

            $ids[] = $log->id;
        }

        if ($ids !== []) {
            $event->message->getHeaders()->addTextHeader(self::LOG_IDS_HEADER, implode(',', $ids));

            $messageId = spl_object_id($event->message);
            $this->pendingByMessage[$messageId] = $ids;

            app()->terminating(function () use ($ids): void {
                EmailLog::query()
                    ->whereIn('id', $ids)
                    ->where('status', EmailLog::STATUS_PENDING)
                    ->update(['status' => EmailLog::STATUS_FAILED]);
            });
        }
    }

    public function handleSent(MessageSent $event): void
    {
        if (! Schema::hasTable('email_logs')) {
            return;
        }

        $messageId = spl_object_id($event->message);
        $ids = $this->logIdsFromMessage($event->message) ?: ($this->pendingByMessage[$messageId] ?? []);

        if ($ids === []) {
            $ids = $this->matchingPendingLogIds($event->message);
        }

        if ($ids !== []) {
            EmailLog::query()
                ->whereIn('id', $ids)
                ->where('status', EmailLog::STATUS_PENDING)
                ->update([
                    'status' => EmailLog::STATUS_SUCCESS,
                    'sent_at' => now(),
                ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function metadata(array $data, Email $message): array
    {
        $mailable = $data['__laravel_mailable'] ?? null;
        $originalLog = $data['originalLog'] ?? null;
        $order = $data['order'] ?? null;
        $event = $data['event'] ?? null;
        $reservation = $data['reservation'] ?? null;
        $user = $data['user'] ?? null;

        if ($mailable === AdminRetriedEmail::class && $originalLog instanceof EmailLog) {
            return [
                'email_type' => $originalLog->email_type,
                'module' => $originalLog->module,
                'mailable_class' => $originalLog->mailable_class ?: $mailable,
                'related_user_id' => $originalLog->related_user_id,
                'related_event_id' => $originalLog->related_event_id,
                'related_reservation_id' => $originalLog->related_reservation_id,
                'related_order_id' => $originalLog->related_order_id,
            ];
        }

        if (! $event instanceof Event && $order instanceof Order) {
            $event = $order->items()->with('event')->first()?->event;
        }

        if (! $user instanceof User && $order instanceof Order) {
            $user = $order->user;
        }

        if (! $user instanceof User && $reservation instanceof Reservation) {
            $user = $reservation->user;
        }

        [$module, $emailType] = $this->classify($mailable, $message->getSubject() ?: '');

        return [
            'email_type' => $emailType,
            'module' => $module,
            'mailable_class' => $mailable,
            'related_user_id' => $user instanceof User ? $user->id : null,
            'related_event_id' => $event instanceof Event ? $event->id : null,
            'related_reservation_id' => $reservation instanceof Reservation ? $reservation->id : null,
            'related_order_id' => $order instanceof Order ? $order->id : null,
        ];
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function classify(?string $mailable, string $subject): array
    {
        return match ($mailable) {
            ReservationRequestReceivedMail::class => [EmailLog::MODULE_RESERVATIONS, 'Reservation Created'],
            NewReservationReceivedMail::class => [EmailLog::MODULE_OWNER, 'Reservation Created'],
            ReservationConfirmedMail::class => [EmailLog::MODULE_RESERVATIONS, 'Reservation Confirmed'],
            ReservationCancelledMail::class, ReservationCancelledByGuestMail::class => [EmailLog::MODULE_RESERVATIONS, 'Reservation Cancelled'],
            ReservationCompletedMail::class => [EmailLog::MODULE_RESERVATIONS, 'Reservation Completed'],
            ReservationNoShowMail::class => [EmailLog::MODULE_RESERVATIONS, 'Reservation No Show'],
            OrderConfirmationMail::class => [EmailLog::MODULE_EVENTS, 'Ticket Purchased'],
            OrganizerTicketSaleMail::class => [EmailLog::MODULE_ORGANIZER, 'Organizer New Ticket Sold'],
            EventCancelledUserMail::class, EventCancelledOrganizerMail::class, EventCancelledAdminMail::class => [EmailLog::MODULE_EVENTS, 'Event Cancelled'],
            default => $this->classifySubject($subject),
        };
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function classifySubject(string $subject): array
    {
        $normalized = mb_strtolower($subject);

        if (str_contains($normalized, 'verify')) {
            return [EmailLog::MODULE_SYSTEM, 'Verify Email'];
        }

        if (str_contains($normalized, 'reset')) {
            return [EmailLog::MODULE_SYSTEM, 'Reset Password'];
        }

        if (str_contains($normalized, 'welcome')) {
            return [EmailLog::MODULE_SYSTEM, 'Welcome Email'];
        }

        if (str_contains($normalized, 'refund')) {
            return [EmailLog::MODULE_EVENTS, 'Ticket Refunded'];
        }

        if (str_contains($normalized, 'announcement')) {
            return [EmailLog::MODULE_SYSTEM, 'System Announcement'];
        }

        return [EmailLog::MODULE_SYSTEM, 'System Email'];
    }

    /**
     * @return array<int, int>
     */
    private function matchingPendingLogIds(Email $message): array
    {
        $recipients = collect($message->getTo())
            ->map(fn (Address $address): string => $address->getAddress())
            ->values();

        if ($recipients->isEmpty()) {
            return [];
        }

        return EmailLog::query()
            ->where('subject', $message->getSubject() ?: '')
            ->where('status', EmailLog::STATUS_PENDING)
            ->whereIn('recipient_email', $recipients)
            ->latest()
            ->limit($recipients->count())
            ->pluck('id')
            ->all();
    }

    /**
     * @return array<int, int>
     */
    private function logIdsFromMessage(Email $message): array
    {
        $header = $message->getHeaders()->get(self::LOG_IDS_HEADER);

        if (! $header) {
            return [];
        }

        return collect(explode(',', $header->getBodyAsString()))
            ->map(fn (string $id): int => (int) trim($id))
            ->filter()
            ->values()
            ->all();
    }
}
