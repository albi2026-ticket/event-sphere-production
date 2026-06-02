<?php

namespace Tests\Feature\Payments;

use App\Models\Event;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MockPaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_mock_payment_marks_order_paid_and_generates_tickets(): void
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
            'title' => 'Mock Checkout Event',
            'slug' => 'mock-checkout-event',
            'category' => 'Concerts',
            'venue_name' => 'Event Sphere Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
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
            'quantity_reserved' => 2,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        $order = Order::query()->create([
            'user_id' => $user->id,
            'order_number' => 'ES-2026-000001',
            'status' => Order::STATUS_PENDING,
            'payment_status' => Order::PAYMENT_STATUS_UNPAID,
            'subtotal' => 50,
            'service_fee' => 2.50,
            'total' => 52.50,
            'currency' => 'USD',
            'billing_email' => $user->email,
            'billing_first_name' => 'Test',
            'billing_last_name' => 'Buyer',
        ]);

        OrderItem::query()->create([
            'order_id' => $order->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'quantity' => 2,
            'unit_price' => 25,
            'service_fee' => 2.50,
            'total' => 52.50,
            'ticket_type_name' => 'General Admission',
            'event_title' => $event->title,
            'event_starts_at' => $event->starts_at,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/payment/mock-success', [
            'order_id' => $order->id,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_PAID)
            ->assertJsonPath('data.payment_status', Order::PAYMENT_STATUS_PAID)
            ->assertJsonPath('data.payment_provider', 'mock')
            ->assertJsonPath('data.tickets_count', 2);

        $order->refresh();
        $ticketType->refresh();

        $this->assertSame(Order::STATUS_PAID, $order->status);
        $this->assertSame(Order::PAYMENT_STATUS_PAID, $order->payment_status);
        $this->assertSame('mock-ES-2026-000001', $order->payment_reference);
        $this->assertNotNull($order->paid_at);
        $this->assertSame(0, $ticketType->quantity_reserved);
        $this->assertSame(2, $ticketType->quantity_sold);
        $this->assertSame(2, $order->tickets()->count());
    }

    public function test_checkout_enforces_event_max_tickets_per_user(): void
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
            'title' => 'Limited Checkout Event',
            'slug' => 'limited-checkout-event',
            'category' => 'Concerts',
            'venue_name' => 'Event Sphere Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'status' => 'published',
            'visibility' => 'public',
            'currency' => 'USD',
            'max_tickets_per_user' => 2,
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

        $firstOrder = Order::query()->create([
            'user_id' => $user->id,
            'order_number' => 'ES-2026-000002',
            'status' => Order::STATUS_PENDING,
            'payment_status' => Order::PAYMENT_STATUS_UNPAID,
            'subtotal' => 25,
            'service_fee' => 1.25,
            'total' => 26.25,
            'currency' => 'USD',
            'billing_email' => $user->email,
            'billing_first_name' => 'Test',
            'billing_last_name' => 'Buyer',
        ]);

        OrderItem::query()->create([
            'order_id' => $firstOrder->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'quantity' => 1,
            'unit_price' => 25,
            'service_fee' => 1.25,
            'total' => 26.25,
            'ticket_type_name' => 'General Admission',
            'event_title' => $event->title,
            'event_starts_at' => $event->starts_at,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [
                'items' => [
                    ['ticket_type_id' => $ticketType->id, 'quantity' => 2],
                ],
                'billing_email' => $user->email,
                'billing_first_name' => 'Test',
                'billing_last_name' => 'Buyer',
                'attendees' => $this->attendees(2),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('items');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [
                'items' => [
                    ['ticket_type_id' => $ticketType->id, 'quantity' => 1],
                ],
                'billing_email' => $user->email,
                'billing_first_name' => 'Test',
                'billing_last_name' => 'Buyer',
                'attendees' => $this->attendees(1),
            ])
            ->assertCreated()
            ->assertJsonPath('data.items.0.quantity', 1);
    }

    public function test_checkout_without_event_limit_allows_quantity_above_ten_when_inventory_exists(): void
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
            'title' => 'No Limit Checkout Event',
            'slug' => 'no-limit-checkout-event',
            'category' => 'Concerts',
            'venue_name' => 'Event Sphere Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'status' => 'published',
            'visibility' => 'public',
            'currency' => 'USD',
            'max_tickets_per_user' => null,
        ]);

        $ticketType = TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 25,
            'currency' => 'USD',
            'quantity_total' => 25,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [
                'items' => [
                    ['ticket_type_id' => $ticketType->id, 'quantity' => 12],
                ],
                'billing_email' => $user->email,
                'billing_first_name' => 'Test',
                'billing_last_name' => 'Buyer',
                'attendees' => $this->attendees(12),
            ])
            ->assertCreated()
            ->assertJsonPath('data.items.0.quantity', 12);
    }

    public function test_checkout_custom_event_limit_above_ten_is_capped_by_inventory(): void
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
            'title' => 'Large Limit Checkout Event',
            'slug' => 'large-limit-checkout-event',
            'category' => 'Concerts',
            'venue_name' => 'Event Sphere Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'status' => 'published',
            'visibility' => 'public',
            'currency' => 'USD',
            'max_tickets_per_user' => 50,
        ]);

        $ticketType = TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 25,
            'currency' => 'USD',
            'quantity_total' => 20,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [
                'items' => [
                    ['ticket_type_id' => $ticketType->id, 'quantity' => 21],
                ],
                'billing_email' => $user->email,
                'billing_first_name' => 'Test',
                'billing_last_name' => 'Buyer',
                'attendees' => $this->attendees(21),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('quantity');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [
                'items' => [
                    ['ticket_type_id' => $ticketType->id, 'quantity' => 20],
                ],
                'billing_email' => $user->email,
                'billing_first_name' => 'Test',
                'billing_last_name' => 'Buyer',
                'attendees' => $this->attendees(20),
            ])
            ->assertCreated()
            ->assertJsonPath('data.items.0.quantity', 20);
    }

    public function test_cancel_unpaid_checkout_releases_reserved_inventory(): void
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
            'title' => 'Cancelled Checkout Event',
            'slug' => 'cancelled-checkout-event',
            'category' => 'Concerts',
            'venue_name' => 'Event Sphere Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'status' => 'published',
            'visibility' => 'public',
            'currency' => 'USD',
        ]);

        $ticketType = TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 25,
            'currency' => 'USD',
            'quantity_total' => 25,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        $attendees = $this->attendees(12);

        $attendees = $this->attendees(12);

        $orderId = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [
                'items' => [
                    ['ticket_type_id' => $ticketType->id, 'quantity' => 12],
                ],
                'billing_email' => $user->email,
                'billing_first_name' => 'Test',
                'billing_last_name' => 'Buyer',
                'attendees' => $attendees,
            ])
            ->assertCreated()
            ->json('data.id');

        $ticketType->refresh();
        $this->assertSame(12, $ticketType->quantity_reserved);
        $this->assertSame(0, $ticketType->quantity_sold);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/orders/{$orderId}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_CANCELLED)
            ->assertJsonPath('data.payment_status', Order::PAYMENT_STATUS_CANCELLED);

        $ticketType->refresh();
        $this->assertSame(0, $ticketType->quantity_reserved);
        $this->assertSame(0, $ticketType->quantity_sold);
    }

    public function test_local_checkout_commits_reserved_inventory_for_large_orders(): void
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
            'title' => 'Local Checkout Event',
            'slug' => 'local-checkout-event',
            'category' => 'Concerts',
            'venue_name' => 'Event Sphere Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'status' => 'published',
            'visibility' => 'public',
            'currency' => 'USD',
            'max_tickets_per_user' => null,
        ]);

        $ticketType = TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 25,
            'currency' => 'USD',
            'quantity_total' => 25,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        $attendees = $this->attendees(12);

        $orderId = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [
                'items' => [
                    ['ticket_type_id' => $ticketType->id, 'quantity' => 12],
                ],
                'billing_email' => $user->email,
                'billing_first_name' => 'Test',
                'billing_last_name' => 'Buyer',
                'attendees' => $attendees,
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/orders/{$orderId}/checkout-session")
            ->assertCreated()
            ->assertJsonPath('data.payment_status', Order::PAYMENT_STATUS_PAID)
            ->assertJsonPath('data.order.status', Order::STATUS_PAID);

        $ticketType->refresh();
        $firstTicket = Order::findOrFail($orderId)->tickets()->orderBy('id')->firstOrFail();

        $this->assertSame(0, $ticketType->quantity_reserved);
        $this->assertSame(12, $ticketType->quantity_sold);
        $this->assertSame(12, Order::findOrFail($orderId)->tickets()->count());
        $this->assertSame($attendees[0]['name'], $firstTicket->attendee_name);
        $this->assertSame($attendees[0]['email'], $firstTicket->attendee_email);
        $this->assertSame($attendees[0]['phone'], $firstTicket->attendee_phone);
    }

    public function test_new_checkout_releases_expired_unpaid_reservations_for_user(): void
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
            'title' => 'Expired Reservation Event',
            'slug' => 'expired-reservation-event',
            'category' => 'Concerts',
            'venue_name' => 'Event Sphere Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
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
            'quantity_reserved' => 4,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        $expiredOrder = Order::query()->create([
            'user_id' => $user->id,
            'order_number' => 'ES-2026-000099',
            'status' => Order::STATUS_PENDING,
            'payment_status' => Order::PAYMENT_STATUS_UNPAID,
            'subtotal' => 100,
            'service_fee' => 5,
            'total' => 105,
            'currency' => 'USD',
            'billing_email' => $user->email,
            'billing_first_name' => 'Test',
            'billing_last_name' => 'Buyer',
            'checkout_expires_at' => now()->subMinute(),
        ]);

        OrderItem::query()->create([
            'order_id' => $expiredOrder->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'quantity' => 4,
            'unit_price' => 25,
            'service_fee' => 5,
            'total' => 105,
            'ticket_type_name' => 'General Admission',
            'event_title' => $event->title,
            'event_starts_at' => $event->starts_at,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [
                'items' => [
                    ['ticket_type_id' => $ticketType->id, 'quantity' => 1],
                ],
                'billing_email' => $user->email,
                'billing_first_name' => 'Test',
                'billing_last_name' => 'Buyer',
                'attendees' => $this->attendees(1),
            ])
            ->assertCreated();

        $ticketType->refresh();
        $expiredOrder->refresh();

        $this->assertSame(1, $ticketType->quantity_reserved);
        $this->assertSame(Order::STATUS_CANCELLED, $expiredOrder->status);
        $this->assertSame(Order::PAYMENT_STATUS_CANCELLED, $expiredOrder->payment_status);
    }

    /**
     * @return array<int, array{name: string, email: string, phone: string}>
     */
    private function attendees(int $count): array
    {
        return collect(range(1, $count))
            ->map(fn (int $number): array => [
                'name' => "Attendee {$number}",
                'email' => "attendee-{$number}@example.test",
                'phone' => '+1 555 0100',
            ])
            ->all();
    }
}
