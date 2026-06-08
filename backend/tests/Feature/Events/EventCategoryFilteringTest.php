<?php

namespace Tests\Feature\Events;

use App\Models\Event;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventCategoryFilteringTest extends TestCase
{
    use RefreshDatabase;

    public function test_category_filter_matches_singular_and_plural_event_category_values(): void
    {
        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $singularFestival = $this->createPublishedEvent($organizer, [
            'title' => 'Live Music Festival',
            'slug' => 'live-music-festival',
            'category' => 'Festival',
        ]);

        $pluralFestival = $this->createPublishedEvent($organizer, [
            'title' => 'Summer Music Festivals',
            'slug' => 'summer-music-festivals',
            'category' => 'Festivals',
        ]);

        $this->createPublishedEvent($organizer, [
            'title' => 'Music Concert',
            'slug' => 'music-concert',
            'category' => 'Concert',
        ]);

        $response = $this->getJson('/api/events?category=festivals&sort=soonest&per_page=9');
        $ids = collect($response->json('data'))->pluck('id')->all();

        $response->assertOk();
        $this->assertContains($singularFestival->id, $ids);
        $this->assertContains($pluralFestival->id, $ids);
        $this->assertCount(2, $ids);
    }

    public function test_category_filter_works_with_search_without_clearing_search(): void
    {
        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $matching = $this->createPublishedEvent($organizer, [
            'title' => 'Music City Festival',
            'slug' => 'music-city-festival',
            'category' => 'Festival',
        ]);

        $this->createPublishedEvent($organizer, [
            'title' => 'Music City Concert',
            'slug' => 'music-city-concert',
            'category' => 'Concerts',
        ]);

        $this->createPublishedEvent($organizer, [
            'title' => 'Food Festival',
            'slug' => 'food-festival',
            'category' => 'Festivals',
        ]);

        $response = $this->getJson('/api/events?category=festivals&q=music&sort=soonest&per_page=9');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matching->id);
    }

    public function test_all_events_excludes_ended_events_but_keeps_live_events(): void
    {
        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $live = $this->createPublishedEvent($organizer, [
            'title' => 'Live Concert',
            'slug' => 'live-concert',
            'starts_at' => now()->subHour(),
            'ends_at' => null,
        ]);

        $upcoming = $this->createPublishedEvent($organizer, [
            'title' => 'Upcoming Concert',
            'slug' => 'upcoming-concert',
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHours(2),
        ]);

        $this->createPublishedEvent($organizer, [
            'title' => 'Ended Concert',
            'slug' => 'ended-concert',
            'starts_at' => now()->subDays(2),
            'ends_at' => now()->subDay(),
        ]);

        $response = $this->getJson('/api/events?sort=soonest&per_page=9');
        $ids = collect($response->json('data'))->pluck('id')->all();

        $response->assertOk();
        $this->assertContains($live->id, $ids);
        $this->assertContains($upcoming->id, $ids);
        $this->assertCount(2, $ids);
    }

    public function test_search_matches_organizer_name(): void
    {
        $organizer = User::factory()->create([
            'name' => 'Dua Events Group',
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);
        $otherOrganizer = User::factory()->create([
            'name' => 'Sports Arena Team',
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $matching = $this->createPublishedEvent($organizer, [
            'title' => 'Summer Live Night',
            'slug' => 'summer-live-night',
        ]);

        $this->createPublishedEvent($otherOrganizer, [
            'title' => 'Summer Sports Night',
            'slug' => 'summer-sports-night',
        ]);

        $response = $this->getJson('/api/events?q=dua&sort=soonest&per_page=9');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matching->id);
    }

    public function test_trending_ranks_live_and_upcoming_events_by_paid_sales_and_excludes_ended_events(): void
    {
        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);
        $buyer = User::factory()->create(['role' => User::ROLE_USER]);

        $live = $this->createPublishedEvent($organizer, [
            'title' => 'Live High Demand Event',
            'slug' => 'live-high-demand-event',
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHours(2),
        ]);
        $upcoming = $this->createPublishedEvent($organizer, [
            'title' => 'Upcoming Smaller Event',
            'slug' => 'upcoming-smaller-event',
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHours(2),
        ]);
        $ended = $this->createPublishedEvent($organizer, [
            'title' => 'Ended High Demand Event',
            'slug' => 'ended-high-demand-event',
            'starts_at' => now()->subDays(2),
            'ends_at' => now()->subDay(),
        ]);

        $this->createPaidOrderItem($buyer, $live, 10, now()->subDay());
        $this->createPaidOrderItem($buyer, $upcoming, 2, now()->subDay());
        $this->createPaidOrderItem($buyer, $ended, 99, now()->subDay());

        $response = $this->getJson('/api/events?sort=trending&per_page=9');
        $ids = collect($response->json('data'))->pluck('id')->all();

        $response->assertOk();
        $this->assertSame([$live->id, $upcoming->id], $ids);
        $response->assertJsonPath('data.0.event_state.key', 'live');
        $response->assertJsonPath('data.0.tickets_sold_count', 10);
    }

    /**
     * @param array<string, mixed> $attributes
     */
    private function createPublishedEvent(User $organizer, array $attributes): Event
    {
        $event = Event::query()->create(array_merge([
            'organizer_id' => $organizer->id,
            'title' => 'Test Event',
            'slug' => fake()->unique()->slug(),
            'category' => 'Concerts',
            'venue_name' => 'Event Sphere Arena',
            'city' => 'Prishtina',
            'starts_at' => now()->addWeek(),
            'ends_at' => now()->addWeek()->addHours(2),
            'status' => 'published',
            'visibility' => 'public',
            'base_price' => 20,
            'currency' => 'USD',
            'views_count' => 1,
        ], $attributes));

        TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 20,
            'currency' => 'USD',
            'quantity_total' => 100,
            'quantity_sold' => 0,
            'quantity_reserved' => 0,
            'status' => TicketType::STATUS_ACTIVE,
            'sort_order' => 1,
        ]);

        return $event;
    }

    private function createPaidOrderItem(User $buyer, Event $event, int $quantity, mixed $createdAt): OrderItem
    {
        $ticketType = $event->ticketTypes()->firstOrFail();
        $order = Order::query()->create([
            'user_id' => $buyer->id,
            'order_number' => fake()->unique()->bothify('DISC-######'),
            'status' => Order::STATUS_PAID,
            'payment_status' => Order::PAYMENT_STATUS_PAID,
            'subtotal' => $quantity * 20,
            'service_fee' => 0,
            'discount_total' => 0,
            'tax_total' => 0,
            'total' => $quantity * 20,
            'currency' => 'USD',
            'billing_email' => $buyer->email,
            'billing_first_name' => 'Test',
            'billing_last_name' => 'Buyer',
            'paid_at' => $createdAt,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);

        return OrderItem::query()->create([
            'order_id' => $order->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'quantity' => $quantity,
            'unit_price' => 20,
            'service_fee' => 0,
            'total' => $quantity * 20,
            'ticket_type_name' => $ticketType->name,
            'event_title' => $event->title,
            'event_starts_at' => $event->starts_at,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
    }
}
