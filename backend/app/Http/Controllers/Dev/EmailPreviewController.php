<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\EmailLog;
use App\Models\Event;
use App\Models\NewsletterSubscription;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Reservation;
use App\Models\Ticket;
use App\Models\TicketType;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueImage;
use Carbon\Carbon;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EmailPreviewController extends Controller
{
    public function index(Request $request): View
    {
        abort_unless(app()->environment('local'), 404);

        $this->setPreviewLocale($request);
        $previews = collect($this->previews());
        $query = trim((string) $request->query('q', ''));

        if ($query !== '') {
            $needle = mb_strtolower($query);
            $previews = $previews->filter(fn (array $preview): bool => str_contains(
                mb_strtolower($preview['title'].' '.$preview['category'].' '.$preview['description'].' '.$preview['slug']),
                $needle
            ));
        }

        return view('dev.emails.index', [
            'groups' => $previews->groupBy('category'),
            'query' => $query,
            'locale' => app()->getLocale(),
            'total' => count($this->previews()),
        ]);
    }

    public function show(Request $request, string $slug)
    {
        abort_unless(app()->environment('local'), 404);

        $this->setPreviewLocale($request);
        $preview = $this->previews()[$slug] ?? null;

        if (! $preview) {
            throw new NotFoundHttpException;
        }

        return response(
            view($preview['view'], $preview['data']())->render()
        );
    }

    /**
     * @return array<string, array{title: string, description: string, category: string, view: string, data: callable(): array<string, mixed>}>
     */
    private function previews(): array
    {
        return [
            'account-welcome' => [
                'title' => 'Welcome',
                'description' => 'New Tiketa account welcome message.',
                'category' => 'Account',
                'view' => 'emails.account.welcome',
                'data' => fn (): array => [
                    'user' => $this->user(),
                    'dashboardUrl' => $this->url('/site/dashboard.html'),
                ],
            ],
            'account-approved' => [
                'title' => 'Account Approved',
                'description' => 'Account approval confirmation.',
                'category' => 'Account',
                'view' => 'emails.account.account-approved',
                'data' => fn (): array => [
                    'user' => $this->user(),
                    'dashboardUrl' => $this->url('/site/dashboard.html'),
                ],
            ],
            'welcome-updates' => [
                'title' => 'Welcome Updates',
                'description' => 'Marketing subscription welcome email.',
                'category' => 'Marketing',
                'view' => 'emails.subscribers.welcome',
                'data' => fn (): array => [
                    'subscription' => new NewsletterSubscription(['source' => 'events']),
                    'unsubscribeUrl' => $this->url('/preferences/unsubscribe/demo'),
                ],
            ],
            'verify-email' => [
                'title' => 'Verify Email',
                'description' => 'Account activation and email verification.',
                'category' => 'Account',
                'view' => 'emails.auth.verify-email',
                'data' => fn (): array => [
                    'user' => $this->user(),
                    'verificationUrl' => $this->url('/verify-email/demo-signature'),
                    'expirationMinutes' => 60,
                ],
            ],
            'password-reset' => [
                'title' => 'Password Reset',
                'description' => 'Secure password reset request.',
                'category' => 'Security',
                'view' => 'emails.auth.reset-password',
                'data' => fn (): array => [
                    'user' => $this->user(),
                    'resetUrl' => $this->url('/site/reset-password.html?token=preview-token&email=john@example.com'),
                    'expirationMinutes' => 60,
                ],
            ],
            'password-changed' => [
                'title' => 'Password Changed',
                'description' => 'Security confirmation after password update.',
                'category' => 'Security',
                'view' => 'emails.account.password-changed',
                'data' => fn (): array => [
                    'user' => $this->user(),
                    'changedAt' => 'Jul 10, 2026 2:30 PM CEST',
                    'securityUrl' => $this->url('/site/dashboard.html#security'),
                ],
            ],
            'email-changed' => [
                'title' => 'Email Changed',
                'description' => 'Security confirmation after email address update.',
                'category' => 'Security',
                'view' => 'emails.account.email-changed',
                'data' => fn (): array => [
                    'user' => $this->user(),
                    'oldEmail' => 'john.old@example.com',
                    'newEmail' => 'john@example.com',
                    'changedAt' => 'Jul 10, 2026 2:30 PM CEST',
                    'securityUrl' => $this->url('/site/dashboard.html#security'),
                ],
            ],
            'login-security-alert' => [
                'title' => 'Login Security Alert',
                'description' => 'New sign-in notice with account protection CTA.',
                'category' => 'Security',
                'view' => 'emails.account.login-security-alert',
                'data' => fn (): array => [
                    'user' => $this->user(),
                    'signedInAt' => 'Jul 10, 2026 2:30 PM CEST',
                    'location' => 'Pristina, Kosovo',
                    'device' => 'Safari on macOS',
                    'securityUrl' => $this->url('/site/dashboard.html#security'),
                ],
            ],
            'organizer-approved' => [
                'title' => 'Organizer Approved',
                'description' => 'Organizer approval and next steps.',
                'category' => 'Organizer',
                'view' => 'emails.account.organizer-approved',
                'data' => fn (): array => [
                    'user' => $this->organizer(),
                    'organizerUrl' => $this->url('/site/organizer.html'),
                ],
            ],
            'order-confirmation' => [
                'title' => 'Order Confirmation',
                'description' => 'Paid order receipt with event and ticket details.',
                'category' => 'Tickets',
                'view' => 'emails.orders.confirmation',
                'data' => fn (): array => $this->orderPreviewData(),
            ],
            'ticket-purchased' => [
                'title' => 'Ticket Purchased',
                'description' => 'Ticket purchase confirmation.',
                'category' => 'Tickets',
                'view' => 'emails.orders.confirmation',
                'data' => fn (): array => $this->orderPreviewData(),
            ],
            'ticket-ready' => [
                'title' => 'Ticket Ready',
                'description' => 'QR ticket access email.',
                'category' => 'Tickets',
                'view' => 'emails.orders.confirmation',
                'data' => fn (): array => $this->orderPreviewData(),
            ],
            'ticket-refunded' => [
                'title' => 'Ticket Refunded',
                'description' => 'Refund confirmation preview placeholder.',
                'category' => 'Tickets',
                'view' => 'emails.dynamic-html',
                'data' => fn (): array => [
                    'html' => view('emails.layouts.tiketa', [
                        'title' => __('emails.refund_confirmation'),
                        'preheader' => __('emails.refund_confirmation_copy'),
                        'eyebrow' => __('emails.email_notification'),
                        'heading' => __('emails.refund_confirmation'),
                        'intro' => __('emails.refund_confirmation_copy'),
                    ])->render(),
                ],
            ],
            'reservation-request-received' => [
                'title' => 'Reservation Request Received',
                'description' => 'Reservation request received confirmation.',
                'category' => 'Reservations',
                'view' => 'emails.reservations.request-received',
                'data' => fn (): array => ['reservation' => $this->reservation()],
            ],
            'reservation-confirmed' => [
                'title' => 'Reservation Confirmed',
                'description' => 'Reservation confirmation.',
                'category' => 'Reservations',
                'view' => 'emails.reservations.confirmed',
                'data' => fn (): array => ['reservation' => $this->reservation()],
            ],
            'reservation-cancelled' => [
                'title' => 'Reservation Cancelled',
                'description' => 'Reservation cancellation notice.',
                'category' => 'Reservations',
                'view' => 'emails.reservations.cancelled',
                'data' => fn (): array => ['reservation' => $this->reservation(cancelled: true)],
            ],
            'reservation-completed' => [
                'title' => 'Reservation Completed',
                'description' => 'Reservation completion notice.',
                'category' => 'Reservations',
                'view' => 'emails.reservations.completed',
                'data' => fn (): array => ['reservation' => $this->reservation()],
            ],
            'reservation-no-show' => [
                'title' => 'Reservation No Show',
                'description' => 'No-show reservation status notice.',
                'category' => 'Reservations',
                'view' => 'emails.reservations.no-show',
                'data' => fn (): array => ['reservation' => $this->reservation()],
            ],
            'reservation-reminder' => [
                'title' => 'Reservation Reminder',
                'description' => 'Reservation reminder preview using reservation layout.',
                'category' => 'Reservations',
                'view' => 'emails.reservations.confirmed',
                'data' => fn (): array => ['reservation' => $this->reservation()],
            ],
            'owner-new-reservation' => [
                'title' => 'New Restaurant Reservation',
                'description' => 'Owner notification for a new reservation.',
                'category' => 'Owner',
                'view' => 'emails.reservations.owner-new',
                'data' => fn (): array => ['reservation' => $this->reservation()],
            ],
            'owner-reservation-cancelled' => [
                'title' => 'Reservation Cancelled By Guest',
                'description' => 'Owner notification when a guest cancels.',
                'category' => 'Owner',
                'view' => 'emails.reservations.cancelled-by-guest',
                'data' => fn (): array => ['reservation' => $this->reservation(cancelled: true)],
            ],
            'organizer-ticket-sold' => [
                'title' => 'New Ticket Sold',
                'description' => 'Organizer ticket sale notification.',
                'category' => 'Organizer',
                'view' => 'emails.events.ticket-sold-organizer',
                'data' => fn (): array => $this->organizerTicketSaleData(),
            ],
            'event-cancelled-user' => [
                'title' => 'Event Cancelled - Guest',
                'description' => 'Guest-facing event cancellation notice.',
                'category' => 'Tickets',
                'view' => 'emails.events.cancelled-user',
                'data' => fn (): array => $this->eventCancellationData(),
            ],
            'event-cancelled-organizer' => [
                'title' => 'Event Cancelled - Organizer',
                'description' => 'Organizer event cancellation confirmation.',
                'category' => 'Organizer',
                'view' => 'emails.events.cancelled-organizer',
                'data' => fn (): array => $this->eventCancellationData(),
            ],
            'event-cancelled-admin' => [
                'title' => 'Event Cancelled - Admin',
                'description' => 'Admin event cancellation alert.',
                'category' => 'Admin',
                'view' => 'emails.events.cancelled-admin',
                'data' => fn (): array => $this->eventCancellationData(),
            ],
            'event-updated' => [
                'title' => 'Event Updated',
                'description' => 'Event update notification preview.',
                'category' => 'Tickets',
                'view' => 'emails.dynamic-html',
                'data' => fn (): array => ['html' => $this->dynamicEmailHtml(__('emails.event_updated'), __('emails.event_updated'), 'NBA Finals Game Night now starts at 8:00 PM. Your ticket remains valid.')],
            ],
            'event-approved' => [
                'title' => 'Event Approved',
                'description' => 'Organizer event approval notification.',
                'category' => 'Organizer',
                'view' => 'emails.dynamic-html',
                'data' => fn (): array => ['html' => $this->dynamicEmailHtml(__('emails.event_approved'), __('emails.event_approved'), 'Your event has been approved and is ready for guests to discover.')],
            ],
            'event-rejected' => [
                'title' => 'Event Rejected',
                'description' => 'Organizer event rejection notification.',
                'category' => 'Organizer',
                'view' => 'emails.dynamic-html',
                'data' => fn (): array => ['html' => $this->dynamicEmailHtml(__('emails.event_rejected'), __('emails.event_rejected'), 'Please review the moderation note and update your event before resubmitting.')],
            ],
            'admin-email-center' => [
                'title' => 'Email Center Retry',
                'description' => 'Admin email center retry placeholder.',
                'category' => 'Admin',
                'view' => 'emails.dynamic-html',
                'data' => fn (): array => [
                    'html' => '<p>This email log stores metadata only. Rendered email bodies are not retained for security.</p>',
                    'text' => 'This email log stores metadata only. Rendered email bodies are not retained for security.',
                    'originalLog' => new EmailLog(['subject' => 'Email Center Retry']),
                ],
            ],
            'contact-reply' => [
                'title' => 'Contact Reply',
                'description' => 'Support reply preview.',
                'category' => 'Admin',
                'view' => 'emails.dynamic-html',
                'data' => fn (): array => ['html' => $this->dynamicEmailHtml('Tiketa Support', 'Thanks for contacting Tiketa', 'Our support team has replied to your request. You can continue the conversation from the Help Center.')],
            ],
        ];
    }

    private function setPreviewLocale(Request $request): void
    {
        $locale = (string) $request->query('locale', app()->getLocale());

        if (! in_array($locale, ['en', 'sq'], true)) {
            $locale = 'en';
        }

        app()->setLocale($locale);
    }

    private function user(): User
    {
        return new User([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'preferred_language' => app()->getLocale(),
        ]);
    }

    private function owner(): User
    {
        return new User([
            'name' => 'Marco Rossi',
            'email' => 'marco@example.com',
            'preferred_language' => app()->getLocale(),
        ]);
    }

    private function organizer(): User
    {
        return new User([
            'name' => 'Alex Johnson',
            'email' => 'alex@example.com',
            'preferred_language' => app()->getLocale(),
        ]);
    }

    private function venue(): Venue
    {
        $venue = new Venue([
            'name' => 'Bella Italia',
            'slug' => 'bella-italia',
            'venue_type' => Venue::TYPE_RESTAURANT,
            'city' => 'Pristina',
            'country' => 'Kosovo',
            'address' => 'Rruga B, Pristina',
            'phone' => '+383 44 123 456',
            'email' => 'hello@bellaitalia.example',
        ]);

        $venue->setRelation('owner', $this->owner());
        $venue->setRelation('images', collect([
            new VenueImage([
                'image_path' => 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop',
                'sort_order' => 1,
            ]),
        ]));

        return $venue;
    }

    private function event(): Event
    {
        $event = new Event([
            'title' => 'NBA Finals Game Night',
            'slug' => 'nba-finals-game-night',
            'category' => 'Sports',
            'venue_name' => 'Grand Arena',
            'address' => 'Courtside Avenue 14',
            'city' => 'Pristina',
            'country' => 'Kosovo',
            'starts_at' => Carbon::create(2026, 7, 20, 20, 0, 0, 'Europe/Belgrade'),
            'ends_at' => Carbon::create(2026, 7, 20, 23, 0, 0, 'Europe/Belgrade'),
            'timezone' => 'Europe/Belgrade',
            'currency' => 'usd',
            'banner_image_url' => 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop',
        ]);

        $event->setRelation('organizer', $this->organizer());
        $event->setRelation('images', collect());

        return $event;
    }

    private function reservation(bool $cancelled = false): Reservation
    {
        $reservation = new Reservation([
            'guest_name' => 'John Doe',
            'phone' => '+383 49 555 121',
            'party_size' => 4,
            'reservation_date' => Carbon::create(2026, 7, 20),
            'reservation_time' => '19:30',
            'status' => $cancelled ? Reservation::STATUS_CANCELLED : Reservation::STATUS_CONFIRMED,
            'notes' => 'Window table if available.',
            'occasion' => 'Anniversary dinner',
            'cancellation_reason' => $cancelled ? 'Guest plans changed.' : null,
            'owner_cancellation_reason' => $cancelled ? 'Private event scheduled at the venue.' : null,
            'cancelled_at' => $cancelled ? Carbon::create(2026, 7, 18, 15, 20) : null,
        ]);

        $reservation->setRelation('venue', $this->venue());
        $reservation->setRelation('user', $this->user());

        return $reservation;
    }

    /**
     * @return array{order: Order, emailData: array<string, mixed>}
     */
    private function orderPreviewData(): array
    {
        $event = $this->event();
        $ticketType = new TicketType(['name' => 'VIP Ticket', 'price' => 149.00]);
        $item = new OrderItem([
            'id' => 45281,
            'quantity' => 2,
            'unit_price' => 149.00,
            'service_fee' => 12.00,
            'total' => 310.00,
            'ticket_type_name' => 'VIP Ticket',
            'event_title' => $event->title,
        ]);
        $item->setRelation('event', $event);
        $item->setRelation('ticketType', $ticketType);

        $order = new Order([
            'order_number' => 'TK-45281',
            'status' => Order::STATUS_PAID,
            'payment_status' => Order::PAYMENT_STATUS_PAID,
            'subtotal' => 298.00,
            'service_fee' => 12.00,
            'total' => 310.00,
            'currency' => 'usd',
            'billing_email' => 'john@example.com',
            'billing_first_name' => 'John',
            'billing_last_name' => 'Doe',
            'paid_at' => Carbon::create(2026, 7, 10, 14, 30),
        ]);
        $order->setRelation('user', $this->user());
        $order->setRelation('items', collect([$item]));
        $order->setRelation('tickets', $this->tickets($order, $event, $ticketType));

        return [
            'order' => $order,
            'emailData' => [
                'brand' => 'Tiketa',
                'purchaser_name' => 'John Doe',
                'purchaser_email' => 'john@example.com',
                'purchase_date' => 'Jul 10, 2026 2:30 PM CEST',
                'my_tickets_url' => $this->url('/site/dashboard.html#tickets'),
                'items' => [[
                    'event_name' => $event->title,
                    'event_date' => 'Jul 20, 2026',
                    'event_time' => '8:00 PM',
                    'timezone_label' => 'Europe/Belgrade',
                    'venue' => 'Grand Arena, Pristina',
                    'ticket_type' => 'VIP Ticket',
                    'quantity' => 2,
                    'price_per_ticket' => 'USD 149.00',
                    'service_fee' => 'USD 12.00',
                    'total_paid' => 'USD 310.00',
                    'attendees' => [
                        ['name' => 'John Doe', 'email' => 'john@example.com'],
                        ['name' => 'Jane Doe', 'email' => 'jane@example.com'],
                    ],
                ]],
                'tickets' => $this->ticketEmailData(),
                'has_qr_tickets' => true,
            ],
        ];
    }

    private function organizerTicketSaleData(): array
    {
        $event = $this->event();
        $orderData = $this->orderPreviewData();

        return [
            'event' => $event,
            'order' => $orderData['order'],
            'emailData' => [
                'event_name' => $event->title,
                'event_date' => 'Jul 20, 2026 8:00 PM CEST',
                'venue' => 'Grand Arena, Pristina',
                'buyer_name' => 'John Doe',
                'buyer_email' => 'john@example.com',
                'order_id' => 'TK-45281',
                'purchase_date' => 'Jul 10, 2026 2:30 PM CEST',
                'tickets' => [
                    ['name' => 'VIP Ticket', 'quantity' => 2, 'price' => 'USD 149.00', 'subtotal' => 'USD 298.00'],
                ],
                'order_total' => 'USD 310.00',
                'tickets_sold' => 124,
                'tickets_remaining' => 36,
                'gross_revenue' => 'USD 18,476.00',
                'currency' => 'USD',
                'view_orders_url' => $this->url('/site/organizer.html#orders'),
                'view_analytics_url' => $this->url('/site/organizer.html#analytics'),
            ],
        ];
    }

    private function eventCancellationData(): array
    {
        return [
            'event' => $this->event(),
            'order' => $this->orderPreviewData()['order'],
            'emailData' => [
                'event_date' => 'Jul 20, 2026 8:00 PM CEST',
                'location' => 'Grand Arena, Courtside Avenue 14, Pristina, Kosovo',
                'organizer_name' => 'Alex Johnson',
                'tickets_sold' => 124,
                'revenue_generated' => 'USD 18,476.00',
                'cancelled_at' => 'Jul 18, 2026 3:20 PM CEST',
                'ticket_holders_notified' => 124,
            ],
        ];
    }

    private function tickets(Order $order, Event $event, TicketType $ticketType): Collection
    {
        return collect([
            new Ticket([
                'ticket_code' => 'VIP-A14-45281',
                'qr_token' => 'preview-qr-token-1',
                'seat_label' => 'Seat A14',
                'attendee_name' => 'John Doe',
                'attendee_email' => 'john@example.com',
                'status' => Ticket::STATUS_VALID,
            ]),
            new Ticket([
                'ticket_code' => 'VIP-A15-45281',
                'qr_token' => 'preview-qr-token-2',
                'seat_label' => 'Seat A15',
                'attendee_name' => 'Jane Doe',
                'attendee_email' => 'jane@example.com',
                'status' => Ticket::STATUS_VALID,
            ]),
        ])->map(function (Ticket $ticket) use ($order, $event, $ticketType): Ticket {
            $ticket->setRelation('order', $order);
            $ticket->setRelation('event', $event);
            $ticket->setRelation('ticketType', $ticketType);

            return $ticket;
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function ticketEmailData(): array
    {
        return [
            [
                'code' => 'VIP-A14-45281',
                'attendee_name' => 'John Doe',
                'attendee_email' => 'john@example.com',
                'ticket_type' => 'VIP Ticket',
                'event_name' => 'NBA Finals Game Night',
                'qr_url' => $this->url('/dev/emails/fake-qr/VIP-A14-45281'),
                'download_url' => $this->url('/dev/emails/fake-ticket/VIP-A14-45281'),
                'has_qr' => true,
            ],
            [
                'code' => 'VIP-A15-45281',
                'attendee_name' => 'Jane Doe',
                'attendee_email' => 'jane@example.com',
                'ticket_type' => 'VIP Ticket',
                'event_name' => 'NBA Finals Game Night',
                'qr_url' => $this->url('/dev/emails/fake-qr/VIP-A15-45281'),
                'download_url' => $this->url('/dev/emails/fake-ticket/VIP-A15-45281'),
                'has_qr' => true,
            ],
        ];
    }

    private function dynamicEmailHtml(string $title, string $heading, string $copy): string
    {
        return view('emails.layouts.tiketa', [
            'title' => $title,
            'preheader' => $copy,
            'eyebrow' => __('emails.email_notification'),
            'heading' => $heading,
            'intro' => $copy,
        ])->render();
    }

    private function url(string $path): string
    {
        return rtrim((string) config('services.frontend.url'), '/').'/'.ltrim($path, '/');
    }
}
