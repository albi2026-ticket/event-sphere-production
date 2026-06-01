<?php

namespace Tests\Feature\User;

use App\Models\Event;
use App\Models\Favorite;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Ticket;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_dashboard_endpoints_return_orders_tickets_favorites_and_persist_settings(): void
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
            'title' => 'Dashboard Event',
            'slug' => 'dashboard-event',
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
            'user_id' => $user->id,
            'order_number' => 'ES-2026-000003',
            'status' => Order::STATUS_PAID,
            'payment_status' => Order::PAYMENT_STATUS_PAID,
            'subtotal' => 25,
            'service_fee' => 1.25,
            'total' => 26.25,
            'currency' => 'USD',
            'billing_email' => $user->email,
            'billing_first_name' => 'Dashboard',
            'billing_last_name' => 'User',
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
            'ticket_code' => 'ES-DASHBOARD-TEST',
            'qr_token' => 'dashboard-test-token',
            'qr_payload' => '{}',
            'user_id' => $user->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'order_id' => $order->id,
            'order_item_id' => $item->id,
            'status' => Ticket::STATUS_ACTIVE,
        ]);

        $favorite = Favorite::query()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/me/profile', [
                'name' => 'Updated Dashboard User',
                'default_city' => 'London',
                'email_notifications' => false,
                'sms_reminders' => true,
                'marketing_emails' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated Dashboard User')
            ->assertJsonPath('data.default_city', 'London')
            ->assertJsonPath('data.email_notifications', false)
            ->assertJsonPath('data.sms_reminders', true)
            ->assertJsonPath('data.marketing_emails', true);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/me/orders?payment_status=paid')
            ->assertOk()
            ->assertJsonPath('data.0.order_number', 'ES-2026-000003');

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/me/tickets/active')
            ->assertOk()
            ->assertJsonPath('data.0.ticket_code', 'ES-DASHBOARD-TEST');

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/me/dashboard/upcoming-events')
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'dashboard-event');

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/me/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.order_number', 'ES-2026-000003')
            ->assertJsonPath('data.tickets.0.ticket_code', 'ES-DASHBOARD-TEST');

        $this->actingAs($user, 'sanctum')
            ->get("/api/me/orders/{$order->id}/receipt")
            ->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=UTF-8');

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/me/favorites')
            ->assertOk()
            ->assertJsonPath('data.0.event_id', $event->id);

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/me/favorites/{$event->id}")
            ->assertOk();

        $this->assertModelMissing($favorite);
    }
}
