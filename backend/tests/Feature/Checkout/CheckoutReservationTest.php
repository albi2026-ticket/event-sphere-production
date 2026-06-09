<?php

namespace Tests\Feature\Checkout;

use App\Mail\OrderConfirmationMail;
use App\Models\CheckoutReservation;
use App\Models\Event;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CheckoutReservationTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_reservation_reduces_available_inventory_for_other_buyers(): void
    {
        [$user, $event, $ticketType] = $this->checkoutFixture(quantityTotal: 5);
        $otherUser = User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout-reservations', [
                'ticket_type_id' => $ticketType->id,
                'quantity' => 4,
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', CheckoutReservation::STATUS_ACTIVE)
            ->assertJsonPath('data.quantity', 4);

        $this->getJson("/api/events/{$event->slug}")
            ->assertOk()
            ->assertJsonPath('data.available_inventory', 1)
            ->assertJsonPath('data.ticket_types.0.quantity_checkout_reserved', 4)
            ->assertJsonPath('data.ticket_types.0.quantity_available', 1);

        $this->actingAs($otherUser, 'sanctum')
            ->postJson('/api/checkout-reservations', [
                'ticket_type_id' => $ticketType->id,
                'quantity' => 2,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('quantity');
    }

    public function test_checkout_reservation_is_attached_to_order_and_completed_after_payment(): void
    {
        Mail::fake();

        [$user, , $ticketType] = $this->checkoutFixture(quantityTotal: 5);

        $reservationId = $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout-reservations', [
                'ticket_type_id' => $ticketType->id,
                'quantity' => 2,
            ])
            ->assertCreated()
            ->json('data.id');

        $orderId = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [
                'items' => [
                    ['ticket_type_id' => $ticketType->id, 'quantity' => 2],
                ],
                'billing_email' => $user->email,
                'billing_first_name' => 'Test',
                'billing_last_name' => 'Buyer',
                'attendees' => $this->attendees(2),
                'checkout_reservation_id' => $reservationId,
            ])
            ->assertCreated()
            ->json('data.id');

        $reservation = CheckoutReservation::query()->findOrFail($reservationId);
        $ticketType->refresh();

        $this->assertSame(CheckoutReservation::STATUS_ACTIVE, $reservation->status);
        $this->assertSame($orderId, $reservation->order_id);
        $this->assertSame($reservationId, Order::query()->findOrFail($orderId)->checkout_reservation_id);
        $this->assertSame(2, $ticketType->quantity_reserved);
        $this->assertSame(0, $ticketType->activeCheckoutReservedQuantity());

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/payment/mock-success', ['order_id' => $orderId])
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_PAID)
            ->assertJsonPath('data.tickets_count', 2);

        $ticketType->refresh();

        $this->assertSame(CheckoutReservation::STATUS_COMPLETED, $reservation->fresh()->status);
        $this->assertSame(0, $ticketType->quantity_reserved);
        $this->assertSame(2, $ticketType->quantity_sold);
        Mail::assertSent(OrderConfirmationMail::class, 1);
    }

    public function test_expired_checkout_reservation_cannot_create_order(): void
    {
        [$user, , $ticketType] = $this->checkoutFixture(quantityTotal: 5);

        $reservationId = $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout-reservations', [
                'ticket_type_id' => $ticketType->id,
                'quantity' => 2,
            ])
            ->assertCreated()
            ->json('data.id');

        CheckoutReservation::query()
            ->whereKey($reservationId)
            ->update(['expires_at' => now()->subMinute()]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [
                'items' => [
                    ['ticket_type_id' => $ticketType->id, 'quantity' => 2],
                ],
                'billing_email' => $user->email,
                'billing_first_name' => 'Test',
                'billing_last_name' => 'Buyer',
                'attendees' => $this->attendees(2),
                'checkout_reservation_id' => $reservationId,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reservation');

        $this->assertSame(CheckoutReservation::STATUS_EXPIRED, CheckoutReservation::query()->findOrFail($reservationId)->status);
        $this->assertSame(0, $ticketType->fresh()->quantity_reserved);
    }

    public function test_order_items_must_match_checkout_reservation(): void
    {
        [$user, , $ticketType] = $this->checkoutFixture(quantityTotal: 5);

        $reservationId = $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout-reservations', [
                'ticket_type_id' => $ticketType->id,
                'quantity' => 2,
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [
                'items' => [
                    ['ticket_type_id' => $ticketType->id, 'quantity' => 1],
                ],
                'billing_email' => $user->email,
                'billing_first_name' => 'Test',
                'billing_last_name' => 'Buyer',
                'attendees' => $this->attendees(1),
                'checkout_reservation_id' => $reservationId,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('checkout_reservation_id');
    }

    public function test_expiration_command_expires_holds_and_releases_unpaid_order_inventory(): void
    {
        [$user, $event, $ticketType] = $this->checkoutFixture(quantityTotal: 5);

        $looseExpired = CheckoutReservation::query()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'quantity' => 1,
            'reserved_at' => now()->subMinutes(6),
            'expires_at' => now()->subMinute(),
            'status' => CheckoutReservation::STATUS_ACTIVE,
        ]);

        $future = CheckoutReservation::query()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'quantity' => 1,
            'reserved_at' => now(),
            'expires_at' => now()->addMinutes(4),
            'status' => CheckoutReservation::STATUS_ACTIVE,
        ]);

        $order = Order::query()->create([
            'user_id' => $user->id,
            'order_number' => 'ES-2026-EXPIRED-HOLD',
            'status' => Order::STATUS_PENDING,
            'payment_status' => Order::PAYMENT_STATUS_UNPAID,
            'subtotal' => 50,
            'service_fee' => 5,
            'total' => 55,
            'currency' => 'USD',
            'billing_email' => $user->email,
            'billing_first_name' => 'Test',
            'billing_last_name' => 'Buyer',
            'checkout_expires_at' => now()->subMinute(),
        ]);

        OrderItem::query()->create([
            'order_id' => $order->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'quantity' => 2,
            'unit_price' => 25,
            'service_fee' => 5,
            'total' => 55,
            'ticket_type_name' => 'General Admission',
            'event_title' => $event->title,
            'event_starts_at' => $event->starts_at,
        ]);

        $attachedExpired = CheckoutReservation::query()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'order_id' => $order->id,
            'quantity' => 2,
            'reserved_at' => now()->subMinutes(6),
            'expires_at' => now()->subMinute(),
            'status' => CheckoutReservation::STATUS_ACTIVE,
        ]);

        $order->forceFill(['checkout_reservation_id' => $attachedExpired->id])->save();
        $ticketType->forceFill(['quantity_reserved' => 2])->save();

        $this->artisan('checkout-reservations:expire')
            ->expectsOutput('Expired 1 checkout reservation(s); released 1 unpaid order(s).')
            ->assertExitCode(0);

        $this->assertSame(CheckoutReservation::STATUS_EXPIRED, $looseExpired->fresh()->status);
        $this->assertSame(CheckoutReservation::STATUS_ACTIVE, $future->fresh()->status);
        $this->assertSame(CheckoutReservation::STATUS_EXPIRED, $attachedExpired->fresh()->status);
        $this->assertSame(Order::STATUS_CANCELLED, $order->fresh()->status);
        $this->assertSame(Order::PAYMENT_STATUS_CANCELLED, $order->fresh()->payment_status);
        $this->assertSame(0, $ticketType->fresh()->quantity_reserved);
        $this->assertSame(4, $ticketType->fresh()->availableQuantity());
    }

    /**
     * @return array{0: User, 1: Event, 2: TicketType}
     */
    private function checkoutFixture(int $quantityTotal = 10): array
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
            'title' => 'Checkout Hold Event',
            'slug' => 'checkout-hold-event-'.strtolower(fake()->bothify('????-####')),
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
            'quantity_total' => $quantityTotal,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        return [$user, $event, $ticketType];
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
