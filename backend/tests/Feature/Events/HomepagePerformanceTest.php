<?php

namespace Tests\Feature\Events;

use App\Models\Event;
use App\Models\EventCategory;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomepagePerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_homepage_event_sections_are_limited_and_lightweight(): void
    {
        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        for ($i = 1; $i <= 14; $i += 1) {
            $event = Event::query()->create([
                'organizer_id' => $organizer->id,
                'title' => "Homepage Event {$i}",
                'slug' => "homepage-event-{$i}",
                'category' => 'Concerts',
                'venue_name' => 'Main Hall',
                'city' => 'Pristina',
                'country' => 'Kosovo',
                'starts_at' => now()->addDays($i),
                'ends_at' => now()->addDays($i)->addHours(2),
                'status' => 'published',
                'visibility' => 'public',
                'base_price' => 25 + $i,
                'currency' => 'USD',
                'is_featured' => true,
                'is_trending' => true,
                'views_count' => $i * 10,
            ]);

            TicketType::query()->create([
                'event_id' => $event->id,
                'name' => 'General Admission',
                'price' => 20 + $i,
                'currency' => 'USD',
                'quantity_total' => 100,
                'quantity_sold' => $i,
                'status' => 'active',
            ]);
        }

        $response = $this->getJson('/api/homepage/trending-events?limit=6');

        $response
            ->assertOk()
            ->assertJsonCount(6, 'data')
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'title',
                    'slug',
                    'image',
                    'category',
                    'location',
                    'starts_at',
                    'price_from',
                    'status',
                ]],
            ])
            ->assertJsonMissingPath('data.0.ticket_types')
            ->assertJsonMissingPath('data.0.organizer')
            ->assertJsonMissingPath('data.0.available_inventory');
    }

    public function test_homepage_categories_return_small_cached_event_groups(): void
    {
        $organizer = User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        EventCategory::query()->updateOrCreate(
            ['slug' => 'concerts'],
            [
                'name' => 'Concerts',
                'icon' => 'bi-music-note',
                'is_active' => true,
                'sort_order' => 1,
            ],
        );

        for ($i = 1; $i <= 5; $i += 1) {
            $event = Event::query()->create([
                'organizer_id' => $organizer->id,
                'title' => "Category Event {$i}",
                'slug' => "category-event-{$i}",
                'category' => 'Concerts',
                'venue_name' => 'Main Hall',
                'city' => 'Pristina',
                'country' => 'Kosovo',
                'starts_at' => now()->addDays($i),
                'ends_at' => now()->addDays($i)->addHours(2),
                'status' => 'published',
                'visibility' => 'public',
                'base_price' => 30,
                'currency' => 'USD',
            ]);

            TicketType::query()->create([
                'event_id' => $event->id,
                'name' => 'General Admission',
                'price' => 30,
                'currency' => 'USD',
                'quantity_total' => 50,
                'status' => 'active',
            ]);
        }

        $response = $this->getJson('/api/homepage/categories?limit=3');

        $response
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'concerts')
            ->assertJsonCount(3, 'data.0.events')
            ->assertJsonMissingPath('data.0.events.0.ticket_types');
    }
}
