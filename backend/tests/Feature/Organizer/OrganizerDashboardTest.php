<?php

namespace Tests\Feature\Organizer;

use App\Models\Event;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Ticket;
use App\Models\TicketType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OrganizerDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_organizer_can_create_ticket_and_publish_complete_event_workflow(): void
    {
        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $eventResponse = $this->actingAs($organizer, 'sanctum')
            ->postJson('/api/organizer/events', [
                'title' => 'Complete Creation Event',
                'category' => 'Concert',
                'description' => 'A fully configured organizer event.',
                'venue_name' => 'Event Sphere Hall',
                'city' => 'New York',
                'address' => '100 Main Street',
                'starts_at' => now()->addMonth()->toIso8601String(),
                'ends_at' => now()->addMonth()->addHours(3)->toIso8601String(),
                'status' => 'draft',
                'visibility' => 'public',
                'max_tickets_per_user' => 5,
                'banner_image_url' => 'https://example.test/cover.jpg',
                'currency' => 'USD',
            ])
            ->assertCreated()
            ->assertJsonPath('data.category', 'Concert')
            ->assertJsonPath('data.address', '100 Main Street')
            ->assertJsonPath('data.max_tickets_per_user', 5);

        $eventId = $eventResponse->json('data.id');

        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/organizer/events/{$eventId}/images", [
                'url' => 'https://example.test/gallery.jpg',
                'type' => 'banner',
                'is_primary' => true,
                'alt_text' => 'Complete Creation Event',
            ])
            ->assertCreated();

        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/organizer/events/{$eventId}/ticket-types", [
                'name' => 'VIP',
                'price' => 120,
                'quantity_total' => 25,
                'currency' => 'USD',
                'status' => TicketType::STATUS_ACTIVE,
                'sort_order' => 2,
            ])
            ->assertCreated();

        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/organizer/events/{$eventId}/ticket-types", [
                'name' => 'Early Bird',
                'price' => 40,
                'quantity_total' => 50,
                'currency' => 'USD',
                'status' => TicketType::STATUS_ACTIVE,
                'sort_order' => 1,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('events', [
            'id' => $eventId,
            'base_price' => 40,
        ]);

        $this->actingAs($organizer, 'sanctum')
            ->patchJson("/api/organizer/events/{$eventId}", ['status' => 'published'])
            ->assertOk()
            ->assertJsonPath('data.status', 'published')
            ->assertJsonPath('data.base_price', '40.00');

        $this->getJson('/api/events/complete-creation-event')
            ->assertOk()
            ->assertJsonPath('data.status', 'published')
            ->assertJsonPath('data.max_tickets_per_user', 5)
            ->assertJsonPath('data.ticket_types.0.name', 'Early Bird')
            ->assertJsonPath('data.ticket_types.0.price', '40.00');
    }

    public function test_uploaded_primary_event_image_is_returned_for_public_and_organizer_event_displays(): void
    {
        Storage::fake('public');

        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $event = Event::query()->create([
            'organizer_id' => $organizer->id,
            'title' => 'Uploaded Image Event',
            'slug' => 'uploaded-image-event',
            'category' => 'Concert',
            'venue_name' => 'Image Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'status' => 'draft',
            'visibility' => 'public',
            'currency' => 'USD',
        ]);

        $this->actingAs($organizer, 'sanctum')
            ->post("/api/organizer/events/{$event->id}/images", [
                'image' => UploadedFile::fake()->image('gallery.jpg', 800, 450),
                'type' => 'gallery',
                'sort_order' => 0,
                'is_primary' => '0',
            ])
            ->assertCreated();

        $primaryResponse = $this->actingAs($organizer, 'sanctum')
            ->post("/api/organizer/events/{$event->id}/images", [
                'image' => UploadedFile::fake()->image('cover.jpg', 1200, 675),
                'type' => 'banner',
                'sort_order' => 10,
                'is_primary' => '1',
                'alt_text' => 'Uploaded Image Event cover',
            ])
            ->assertCreated()
            ->assertJsonPath('data.is_primary', true);

        $primaryUrl = $primaryResponse->json('data.url');
        $event->refresh();

        $this->assertNotEmpty($primaryUrl);
        $this->assertSame($primaryUrl, $event->banner_image_url);
        Storage::disk('public')->assertExists($event->images()->first()->path);

        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/organizer/events/{$event->id}/ticket-types", [
                'name' => 'General Admission',
                'price' => 40,
                'quantity_total' => 50,
                'currency' => 'USD',
                'status' => TicketType::STATUS_ACTIVE,
            ])
            ->assertCreated();

        $this->actingAs($organizer, 'sanctum')
            ->patchJson("/api/organizer/events/{$event->id}", ['status' => 'published'])
            ->assertOk()
            ->assertJsonPath('data.banner_image_url', $primaryUrl)
            ->assertJsonPath('data.images.0.url', $primaryUrl)
            ->assertJsonPath('data.images.0.is_primary', true);

        $this->getJson('/api/events/uploaded-image-event')
            ->assertOk()
            ->assertJsonPath('data.banner_image_url', $primaryUrl)
            ->assertJsonPath('data.images.0.url', $primaryUrl)
            ->assertJsonPath('data.images.0.is_primary', true);
    }

    public function test_event_times_are_normalized_from_kosovo_timezone_without_display_shift(): void
    {
        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $response = $this->actingAs($organizer, 'sanctum')
            ->postJson('/api/organizer/events', [
                'title' => 'Pristina Time Event',
                'category' => 'Concert',
                'venue_name' => 'Event Sphere Hall',
                'city' => 'Pristina',
                'starts_at' => '2026-06-10T19:00',
                'ends_at' => '2026-06-10T22:00',
                'status' => 'draft',
                'visibility' => 'public',
                'currency' => 'USD',
            ])
            ->assertCreated()
            ->assertJsonPath('data.timezone', 'Europe/Pristina');

        $event = Event::findOrFail($response->json('data.id'));

        $this->assertSame(
            '2026-06-10 17:00:00',
            $event->starts_at->copy()->utc()->format('Y-m-d H:i:s')
        );
        $this->assertSame(
            '2026-06-10 19:00',
            $event->starts_at->copy()->setTimezone('Europe/Belgrade')->format('Y-m-d H:i')
        );

        $this->actingAs($organizer, 'sanctum')
            ->patchJson("/api/organizer/events/{$event->id}", [
                'starts_at' => '2026-06-10T19:00',
                'ends_at' => '2026-06-10T22:00',
            ])
            ->assertOk()
            ->assertJsonPath('data.timezone', 'Europe/Pristina');

        $event->refresh();

        $this->assertTrue($event->starts_at->equalTo(Carbon::parse('2026-06-10 19:00', 'Europe/Belgrade')->utc()));
    }

    public function test_organizer_can_edit_and_restock_sold_out_published_event(): void
    {
        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $event = Event::query()->create([
            'organizer_id' => $organizer->id,
            'title' => 'Sold Out Restock Event',
            'slug' => 'sold-out-restock-event',
            'category' => 'Concerts',
            'venue_name' => 'Event Sphere Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'ends_at' => now()->addMonth()->addHours(3),
            'status' => 'published',
            'visibility' => 'public',
            'currency' => 'USD',
        ]);

        $ticketType = TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'VIP',
            'price' => 100,
            'currency' => 'USD',
            'quantity_total' => 100,
            'quantity_sold' => 100,
            'quantity_reserved' => 0,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_SOLD_OUT,
        ]);

        $this->actingAs($organizer, 'sanctum')
            ->patchJson("/api/organizer/events/{$event->id}", [
                'title' => 'Sold Out Restock Event Updated',
            ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Sold Out Restock Event Updated')
            ->assertJsonPath('data.status', 'published')
            ->assertJsonPath('data.event_state.key', 'sold_out');

        $this->actingAs($organizer, 'sanctum')
            ->patchJson("/api/organizer/ticket-types/{$ticketType->id}", [
                'quantity_total' => 150,
            ])
            ->assertOk()
            ->assertJsonPath('data.quantity_total', 150)
            ->assertJsonPath('data.quantity_sold', 100)
            ->assertJsonPath('data.quantity_available', 50)
            ->assertJsonPath('data.status', TicketType::STATUS_ACTIVE);

        $this->actingAs($organizer, 'sanctum')
            ->getJson("/api/organizer/events/{$event->id}")
            ->assertOk()
            ->assertJsonPath('data.sold_tickets', 100)
            ->assertJsonPath('data.total_inventory', 150)
            ->assertJsonPath('data.available_inventory', 50)
            ->assertJsonPath('data.event_state.key', 'upcoming');
    }

    public function test_organizer_dashboard_endpoints_support_events_analytics_and_attendee_search(): void
    {
        $organizer = User::factory()->create([
            'name' => 'Organizer User',
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $buyer = User::factory()->create([
            'name' => 'Attendee Search Match',
            'email' => 'attendee-search@example.test',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);

        $event = Event::query()->create([
            'organizer_id' => $organizer->id,
            'title' => 'Organizer Dashboard Event',
            'slug' => 'organizer-dashboard-event',
            'category' => 'Concerts',
            'venue_name' => 'Event Sphere Hall',
            'city' => 'New York',
            'starts_at' => now()->addMonth(),
            'status' => 'draft',
            'visibility' => 'public',
            'currency' => 'USD',
        ]);

        $ticketType = TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 40,
            'currency' => 'USD',
            'quantity_total' => 100,
            'quantity_sold' => 2,
            'quantity_reserved' => 0,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        $order = Order::query()->create([
            'user_id' => $buyer->id,
            'order_number' => 'ES-ORG-000001',
            'status' => Order::STATUS_PAID,
            'payment_status' => Order::PAYMENT_STATUS_PAID,
            'subtotal' => 80,
            'service_fee' => 4,
            'total' => 84,
            'currency' => 'USD',
            'billing_email' => $buyer->email,
            'billing_first_name' => 'Attendee',
            'billing_last_name' => 'Match',
            'paid_at' => now(),
        ]);

        $item = OrderItem::query()->create([
            'order_id' => $order->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'quantity' => 2,
            'unit_price' => 40,
            'service_fee' => 4,
            'total' => 84,
            'ticket_type_name' => $ticketType->name,
            'event_title' => $event->title,
            'event_starts_at' => $event->starts_at,
        ]);

        Ticket::query()->create([
            'ticket_code' => 'ES-ORG-TICKET-1',
            'qr_token' => 'organizer-dashboard-token',
            'qr_payload' => '{}',
            'user_id' => $buyer->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'order_id' => $order->id,
            'order_item_id' => $item->id,
            'status' => Ticket::STATUS_ACTIVE,
        ]);

        $this->actingAs($organizer, 'sanctum')
            ->patchJson("/api/organizer/events/{$event->id}", ['status' => 'published'])
            ->assertOk()
            ->assertJsonPath('data.status', 'published');

        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/organizer/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('data.cards.events_count', 1)
            ->assertJsonPath('data.cards.tickets_sold', 2);

        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/organizer/events/performance')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Organizer Dashboard Event')
            ->assertJsonPath('data.0.tickets_available', 98);

        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/organizer/inventory')
            ->assertOk()
            ->assertJsonPath('data.0.quantity_available', 98);

        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/organizer/analytics/revenue?group_by=day')
            ->assertOk()
            ->assertJsonPath('data.by_event.0.revenue', 84);

        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/organizer/analytics')
            ->assertOk()
            ->assertJsonPath('data.conversion_metrics.0.event_id', $event->id)
            ->assertJsonPath('data.conversion_metrics.0.event_views', null)
            ->assertJsonPath('data.conversion_metrics.0.ticket_purchases', 1)
            ->assertJsonPath('data.conversion_metrics.0.conversion_rate', null);

        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/organizer/attendees?search=Search%20Match')
            ->assertOk()
            ->assertJsonPath('data.0.ticket_code', 'ES-ORG-TICKET-1');

        $this->actingAs($organizer, 'sanctum')
            ->patchJson("/api/organizer/events/{$event->id}", ['status' => 'draft'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->actingAs($organizer, 'sanctum')
            ->patchJson("/api/organizer/events/{$event->id}", ['status' => 'cancelled'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_organizer_events_include_computed_event_state_from_status_date_and_inventory(): void
    {
        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        Carbon::setTestNow(Carbon::parse('2026-06-03 12:00:00', 'UTC'));

        $draft = $this->createOrganizerEventWithInventory($organizer, 'Draft Inventory Event', 'draft-inventory-event', 'draft', now()->addMonth(), null, 100, 0);
        $ended = $this->createOrganizerEventWithInventory($organizer, 'Ended Inventory Event', 'ended-inventory-event', 'published', now()->subDay(), now()->subMinute(), 100, 0);
        $soldOut = $this->createOrganizerEventWithInventory($organizer, 'Sold Out Inventory Event', 'sold-out-inventory-event', 'published', now()->addMonth(), now()->addMonth()->addHours(3), 100, 100);
        $upcoming = $this->createOrganizerEventWithInventory($organizer, 'Upcoming Inventory Event', 'upcoming-inventory-event', 'published', now()->addMonth(), now()->addMonth()->addHours(3), 100, 25);
        $live = $this->createOrganizerEventWithInventory($organizer, 'Live Inventory Event', 'live-inventory-event', 'published', now()->subHour(), now()->addHour(), 100, 25);
        $liveWithoutEnd = $this->createOrganizerEventWithInventory($organizer, 'Live No End Inventory Event', 'live-no-end-inventory-event', 'published', now()->subDay(), null, 100, 25);

        $response = $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/organizer/events?per_page=10')
            ->assertOk();

        $events = collect($response->json('data'))->keyBy('slug');

        $this->assertSame('draft', $events[$draft->slug]['event_state']['key']);
        $this->assertSame('ended', $events[$ended->slug]['event_state']['key']);
        $this->assertSame('sold_out', $events[$soldOut->slug]['event_state']['key']);
        $this->assertSame('upcoming', $events[$upcoming->slug]['event_state']['key']);
        $this->assertSame('live', $events[$live->slug]['event_state']['key']);
        $this->assertSame('live', $events[$liveWithoutEnd->slug]['event_state']['key']);
        $this->assertSame(100, $events[$soldOut->slug]['sold_tickets']);
        $this->assertSame(0, $events[$soldOut->slug]['available_inventory']);

        Carbon::setTestNow();
    }

    private function createOrganizerEventWithInventory(User $organizer, string $title, string $slug, string $status, mixed $startsAt, mixed $endsAt, int $total, int $sold): Event
    {
        $event = Event::query()->create([
            'organizer_id' => $organizer->id,
            'title' => $title,
            'slug' => $slug,
            'category' => 'Concerts',
            'venue_name' => 'Event Sphere Hall',
            'city' => 'New York',
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => $status,
            'visibility' => 'public',
            'currency' => 'USD',
        ]);

        TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 40,
            'currency' => 'USD',
            'quantity_total' => $total,
            'quantity_sold' => $sold,
            'quantity_reserved' => 0,
            'min_per_order' => 1,
            'max_per_order' => 10,
            'status' => TicketType::STATUS_ACTIVE,
        ]);

        return $event;
    }
}
