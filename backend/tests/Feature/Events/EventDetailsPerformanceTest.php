<?php

namespace Tests\Feature\Events;

use App\Models\CheckoutReservation;
use App\Models\Event;
use App\Models\Favorite;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventDetailsPerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_event_details_payload_is_checkout_ready_without_listing_extras(): void
    {
        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);
        $buyer = User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);
        $event = $this->createPublishedEvent($organizer);
        $ticketType = TicketType::query()->create([
            'event_id' => $event->id,
            'name' => 'General Admission',
            'price' => 25,
            'currency' => 'USD',
            'quantity_total' => 20,
            'quantity_sold' => 2,
            'quantity_reserved' => 1,
            'status' => TicketType::STATUS_ACTIVE,
            'sort_order' => 1,
        ]);

        CheckoutReservation::query()->create([
            'user_id' => $buyer->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'quantity' => 3,
            'reserved_at' => now(),
            'expires_at' => now()->addMinutes(5),
            'status' => CheckoutReservation::STATUS_ACTIVE,
        ]);

        $response = $this->getJson("/api/events/{$event->slug}");

        $response
            ->assertOk()
            ->assertJsonPath('data.id', $event->id)
            ->assertJsonPath('data.ticket_types.0.quantity_checkout_reserved', 3)
            ->assertJsonPath('data.ticket_types.0.quantity_available', 14)
            ->assertJsonPath('data.available_inventory', 14)
            ->assertJsonMissingPath('data.tickets_sold_count')
            ->assertJsonMissingPath('data.recent_tickets_sold_count')
            ->assertJsonMissingPath('data.reviews_count')
            ->assertJsonMissingPath('data.favorites_count');
    }

    public function test_single_event_favorite_status_does_not_require_favorites_listing(): void
    {
        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);
        $buyer = User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);
        $event = $this->createPublishedEvent($organizer);

        Favorite::query()->create([
            'user_id' => $buyer->id,
            'event_id' => $event->id,
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->getJson("/api/me/favorites/{$event->id}/status")
            ->assertOk()
            ->assertJsonPath('data.event_id', $event->id)
            ->assertJsonPath('data.is_favorited', true);
    }

    public function test_related_events_are_limited_and_lightweight(): void
    {
        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);
        $event = $this->createPublishedEvent($organizer, ['slug' => 'source-event', 'category' => 'Concerts']);

        for ($i = 1; $i <= 8; $i += 1) {
            $this->createPublishedEvent($organizer, [
                'title' => "Related {$i}",
                'slug' => "related-{$i}",
                'category' => 'Concerts',
                'starts_at' => now()->addDays($i),
            ]);
        }

        $response = $this->getJson("/api/events/{$event->slug}/related");

        $response
            ->assertOk()
            ->assertJsonCount(6, 'data')
            ->assertJsonMissingPath('data.0.ticket_types')
            ->assertJsonMissingPath('data.0.organizer');
    }

    /**
     * @param array<string, mixed> $attributes
     */
    private function createPublishedEvent(User $organizer, array $attributes = []): Event
    {
        return Event::query()->create(array_merge([
            'organizer_id' => $organizer->id,
            'title' => 'Detail Performance Event',
            'slug' => fake()->unique()->slug(),
            'category' => 'Concerts',
            'description' => 'A performance test event.',
            'venue_name' => 'Event Sphere Arena',
            'city' => 'Prishtina',
            'country' => 'Kosovo',
            'starts_at' => now()->addWeek(),
            'ends_at' => now()->addWeek()->addHours(2),
            'status' => 'published',
            'visibility' => 'public',
            'base_price' => 20,
            'currency' => 'USD',
            'views_count' => 1,
        ], $attributes));
    }
}
