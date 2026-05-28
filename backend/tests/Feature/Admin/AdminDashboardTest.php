<?php

namespace Tests\Feature\Admin;

use App\Models\Event;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Ticket;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_filter_users_change_roles_and_approve_organizers(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $user = User::factory()->create([
            'name' => 'Pending Organizer',
            'email' => 'pending-organizer@example.test',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_PENDING,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/users?q=pending&organizer_status=pending')
            ->assertOk()
            ->assertJsonPath('data.0.email', 'pending-organizer@example.test');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$user->id}/role", ['role' => User::ROLE_ORGANIZER])
            ->assertOk()
            ->assertJsonPath('data.role', User::ROLE_ORGANIZER);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$user->id}/approve-organizer")
            ->assertOk()
            ->assertJsonPath('data.organizer_status', User::ORGANIZER_STATUS_APPROVED);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$admin->id}/role", ['role' => User::ROLE_USER])
            ->assertUnprocessable();
    }

    public function test_admin_can_refund_mock_paid_orders(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $buyer = User::factory()->create([
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
            'title' => 'Admin Refund Event',
            'slug' => 'admin-refund-event',
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
            'quantity_sold' => 1,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        $order = Order::query()->create([
            'user_id' => $buyer->id,
            'order_number' => 'ES-2026-000002',
            'status' => Order::STATUS_PAID,
            'payment_status' => Order::PAYMENT_STATUS_PAID,
            'payment_provider' => 'mock',
            'payment_reference' => 'mock-ES-2026-000002',
            'subtotal' => 25,
            'service_fee' => 1.25,
            'total' => 26.25,
            'currency' => 'USD',
            'billing_email' => $buyer->email,
            'billing_first_name' => 'Refund',
            'billing_last_name' => 'Buyer',
            'paid_at' => now(),
        ]);

        $item = OrderItem::query()->create([
            'order_id' => $order->id,
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

        Ticket::query()->create([
            'ticket_code' => 'ES-TEST-REFUND',
            'qr_token' => 'test-refund-token',
            'qr_payload' => '{}',
            'user_id' => $buyer->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'order_id' => $order->id,
            'order_item_id' => $item->id,
            'status' => Ticket::STATUS_ACTIVE,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/payments/{$order->id}/refund", ['reason' => 'requested_by_customer'])
            ->assertOk()
            ->assertJsonPath('data.status', 'succeeded');

        $order->refresh();

        $this->assertSame(Order::STATUS_REFUNDED, $order->status);
        $this->assertSame(Order::PAYMENT_STATUS_REFUNDED, $order->payment_status);
        $this->assertSame(Ticket::STATUS_REFUNDED, $order->tickets()->first()->status);
    }
}
