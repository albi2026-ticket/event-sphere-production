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
}
