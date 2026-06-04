<?php

namespace Tests\Feature\Tickets;

use App\Models\Event;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Ticket;
use App\Models\TicketType;
use App\Models\TicketValidationLog;
use App\Models\User;
use App\Services\Tickets\TicketService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TicketCheckInTest extends TestCase
{
    use RefreshDatabase;

    public function test_paid_order_generates_unique_qr_tickets_per_attendee(): void
    {
        [$user, , , , $order] = $this->createOrder(quantity: 2);

        app(TicketService::class)->generateForPaidOrder($order);

        $tickets = Ticket::query()->where('order_id', $order->id)->get();

        $this->assertCount(2, $tickets);
        $this->assertCount(2, $tickets->pluck('ticket_uuid')->unique());
        $this->assertCount(2, $tickets->pluck('qr_token')->unique());

        foreach ($tickets as $ticket) {
            $payload = json_decode($ticket->qr_payload, true, flags: JSON_THROW_ON_ERROR);

            $this->assertSame(Ticket::STATUS_VALID, $ticket->status);
            $this->assertNotNull($ticket->issued_at);
            $this->assertSame($ticket->ticket_uuid, $payload['ticket_uuid']);
            $this->assertSame($ticket->qr_token, $payload['token']);
            $this->assertArrayNotHasKey('validation_url', $payload);
            $this->assertSame($user->id, $ticket->user_id);
        }
    }

    public function test_organizer_can_validate_and_check_in_a_valid_ticket_once(): void
    {
        [, $organizer, , , $order] = $this->createOrder(quantity: 1);
        $ticket = app(TicketService::class)->generateForPaidOrder($order)[0];

        $payload = [
            'token' => $ticket->qr_token,
            'ticket_uuid' => $ticket->ticket_uuid,
            'event_id' => $ticket->event_id,
            'method' => 'qr',
        ];

        $this->actingAs($organizer, 'sanctum')
            ->postJson('/api/organizer/tickets/validate', $payload)
            ->assertOk()
            ->assertJsonPath('data.validation.result', TicketValidationLog::RESULT_VALID)
            ->assertJsonPath('data.validation.can_check_in', true);

        $this->actingAs($organizer, 'sanctum')
            ->postJson('/api/organizer/tickets/check-in', $payload)
            ->assertOk()
            ->assertJsonPath('data.validation.result', TicketValidationLog::RESULT_ALREADY_USED)
            ->assertJsonPath('data.ticket.status', Ticket::STATUS_CHECKED_IN);

        $ticket->refresh();
        $this->assertSame(Ticket::STATUS_CHECKED_IN, $ticket->status);
        $this->assertNotNull($ticket->checked_in_at);
        $this->assertSame($organizer->id, $ticket->checked_in_by);

        $this->actingAs($organizer, 'sanctum')
            ->postJson('/api/organizer/tickets/check-in', $payload)
            ->assertUnprocessable()
            ->assertJsonPath('data.validation.result', TicketValidationLog::RESULT_ALREADY_USED)
            ->assertJsonPath('data.validation.can_check_in', false);

        $this->assertDatabaseHas('ticket_validation_logs', [
            'ticket_id' => $ticket->id,
            'event_id' => $ticket->event_id,
            'scanned_by' => $organizer->id,
            'result' => TicketValidationLog::RESULT_VALID,
        ]);
        $this->assertDatabaseHas('ticket_validation_logs', [
            'ticket_id' => $ticket->id,
            'result' => TicketValidationLog::RESULT_ALREADY_USED,
        ]);
    }

    public function test_invalid_qr_scan_returns_invalid_result_and_creates_log(): void
    {
        [, $organizer, $event] = $this->createOrder(quantity: 1);

        $this->actingAs($organizer, 'sanctum')
            ->postJson('/api/organizer/tickets/validate', [
                'token' => 'not-a-real-token',
                'ticket_uuid' => (string) Str::uuid(),
                'event_id' => $event->id,
                'method' => 'mobile_scanner',
            ])
            ->assertOk()
            ->assertJsonPath('data.validation.result', TicketValidationLog::RESULT_INVALID)
            ->assertJsonPath('data.validation.can_check_in', false)
            ->assertJsonPath('data.ticket', null);

        $this->assertDatabaseHas('ticket_validation_logs', [
            'event_id' => $event->id,
            'scanned_by' => $organizer->id,
            'result' => TicketValidationLog::RESULT_INVALID,
            'method' => 'mobile_scanner',
        ]);
    }

    /**
     * @return array{0: User, 1: User, 2: Event, 3: TicketType, 4: Order}
     */
    private function createOrder(int $quantity): array
    {
        $user = User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);

        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $event = Event::query()->create([
            'organizer_id' => $organizer->id,
            'title' => 'QR Validation Event',
            'slug' => 'qr-validation-event-'.Str::random(6),
            'category' => 'Concerts',
            'venue_name' => 'Event Sphere Hall',
            'city' => 'New York',
            'starts_at' => now()->addWeek(),
            'status' => 'published',
            'visibility' => 'public',
            'currency' => 'USD',
        ]);

        $ticketType = TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 25,
            'currency' => 'USD',
            'quantity_total' => 10,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        $order = Order::query()->create([
            'user_id' => $user->id,
            'order_number' => 'ES-2026-'.Str::upper(Str::random(6)),
            'status' => Order::STATUS_PAID,
            'payment_status' => Order::PAYMENT_STATUS_PAID,
            'subtotal' => $quantity * 25,
            'service_fee' => 0,
            'total' => $quantity * 25,
            'currency' => 'USD',
            'billing_email' => $user->email,
            'billing_first_name' => 'Test',
            'billing_last_name' => 'Buyer',
            'paid_at' => now(),
        ]);

        OrderItem::query()->create([
            'order_id' => $order->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'quantity' => $quantity,
            'unit_price' => 25,
            'service_fee' => 0,
            'total' => $quantity * 25,
            'ticket_type_name' => 'General Admission',
            'event_title' => $event->title,
            'event_starts_at' => $event->starts_at,
            'attendee_details' => collect(range(1, $quantity))->map(fn (int $index) => [
                'name' => "Attendee {$index}",
                'email' => "attendee{$index}@example.com",
                'phone' => null,
            ])->all(),
        ]);

        return [$user, $organizer, $event, $ticketType, $order];
    }
}
