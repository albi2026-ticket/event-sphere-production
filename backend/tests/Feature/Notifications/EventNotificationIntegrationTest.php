<?php

namespace Tests\Feature\Notifications;

use App\Mail\EventCancelledUserMail;
use App\Mail\OrderConfirmationMail;
use App\Models\Event;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Ticket;
use App\Models\TicketType;
use App\Models\User;
use App\Services\Tickets\TicketService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

class EventNotificationIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_ticket_purchase_creates_buyer_notification_without_replacing_email(): void
    {
        Mail::fake();

        $buyer = $this->user();
        $event = $this->event();
        $ticketType = $this->ticketType($event);

        $orderId = $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/orders', [
                'items' => [['ticket_type_id' => $ticketType->id, 'quantity' => 1]],
                'billing_email' => $buyer->email,
                'billing_first_name' => 'Ticket',
                'billing_last_name' => 'Buyer',
                'attendees' => [['name' => 'Ticket Buyer', 'email' => $buyer->email]],
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/payment/mock-success', ['order_id' => $orderId])
            ->assertOk();

        Mail::assertSent(OrderConfirmationMail::class);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $buyer->id,
            'type' => Notification::TYPE_TICKET_PURCHASED,
            'title' => 'Ticket Purchased',
            'message' => 'Your ticket for "Notification Event" has been successfully purchased.',
            'link' => "event-details.html?id={$event->id}",
        ]);
    }

    public function test_admin_event_approval_and_rejection_notify_the_organizer(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'status' => User::STATUS_ACTIVE]);
        $organizer = $this->organizer();
        $event = $this->event($organizer, 'draft');
        $this->ticketType($event);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/events/{$event->id}/publish")
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $organizer->id,
            'type' => Notification::TYPE_EVENT_APPROVED,
            'title' => 'Event Approved',
            'message' => 'Your event "Notification Event" has been approved and is now publicly visible.',
        ]);

        $rejected = $this->event($organizer, 'pending_review', 'Rejected Event');
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/events/{$rejected->id}/reject", ['reason' => 'Needs a clearer venue.'])
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $organizer->id,
            'type' => Notification::TYPE_EVENT_REJECTED,
            'title' => 'Event Rejected',
            'message' => 'Your event "Rejected Event" has been rejected. Reason: Needs a clearer venue.',
        ]);
    }

    public function test_published_event_update_and_cancellation_notify_ticket_holders(): void
    {
        Mail::fake();

        $buyer = $this->user();
        $organizer = $this->organizer();
        $event = $this->event($organizer);
        $this->paidOrderWithTicket($buyer, $event);

        $this->actingAs($organizer, 'sanctum')
            ->patchJson("/api/organizer/events/{$event->id}", ['city' => 'Boston'])
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $buyer->id,
            'type' => Notification::TYPE_EVENT_UPDATED,
            'title' => 'Event Updated',
            'message' => '"Notification Event" has been updated.',
            'link' => "event-details.html?id={$event->id}",
        ]);

        $this->actingAs($organizer, 'sanctum')
            ->patchJson("/api/organizer/events/{$event->id}", ['status' => 'cancelled'])
            ->assertOk();

        Mail::assertSent(EventCancelledUserMail::class);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $buyer->id,
            'type' => Notification::TYPE_EVENT_CANCELLED,
            'title' => 'Event Cancelled',
            'message' => '"Notification Event" has been cancelled.',
            'link' => "event-details.html?id={$event->id}",
        ]);
    }

    public function test_refund_creates_ticket_owner_notification(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'status' => User::STATUS_ACTIVE]);
        $buyer = $this->user();
        $event = $this->event();
        $order = $this->paidOrderWithTicket($buyer, $event);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/payments/{$order->id}/refund", ['reason' => 'requested_by_customer'])
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $buyer->id,
            'type' => Notification::TYPE_TICKET_REFUNDED,
            'title' => 'Ticket Refunded',
            'message' => 'Your ticket for "Notification Event" has been refunded.',
            'link' => "event-details.html?id={$event->id}",
        ]);
    }

    private function user(): User
    {
        return User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);
    }

    private function organizer(): User
    {
        return User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);
    }

    private function event(?User $organizer = null, string $status = 'published', string $title = 'Notification Event'): Event
    {
        $organizer ??= $this->organizer();

        return Event::query()->create([
            'organizer_id' => $organizer->id,
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::random(6),
            'category' => 'Concerts',
            'venue_name' => 'Notification Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'status' => $status,
            'visibility' => 'public',
            'currency' => 'USD',
        ]);
    }

    private function ticketType(Event $event): TicketType
    {
        return TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 25,
            'currency' => 'USD',
            'quantity_total' => 10,
            'quantity_sold' => 0,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);
    }

    private function paidOrderWithTicket(User $buyer, Event $event): Order
    {
        $ticketType = $this->ticketType($event);

        $order = Order::query()->create([
            'user_id' => $buyer->id,
            'order_number' => 'ES-2026-'.Str::upper(Str::random(6)),
            'status' => Order::STATUS_PAID,
            'payment_status' => Order::PAYMENT_STATUS_PAID,
            'subtotal' => 25,
            'service_fee' => 0,
            'total' => 25,
            'currency' => 'USD',
            'billing_email' => $buyer->email,
            'billing_first_name' => 'Ticket',
            'billing_last_name' => 'Buyer',
            'paid_at' => now(),
        ]);

        OrderItem::query()->create([
            'order_id' => $order->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'quantity' => 1,
            'unit_price' => 25,
            'service_fee' => 0,
            'total' => 25,
            'ticket_type_name' => $ticketType->name,
            'event_title' => $event->title,
            'event_starts_at' => $event->starts_at,
            'attendee_details' => [['name' => $buyer->name, 'email' => $buyer->email]],
        ]);

        app(TicketService::class)->generateForPaidOrder($order);

        return $order->fresh(['tickets']);
    }
}
