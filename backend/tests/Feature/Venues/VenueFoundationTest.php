<?php

namespace Tests\Feature\Venues;

use App\Models\CuisineType;
use App\Models\PaymentOption;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueBlackoutDate;
use App\Models\VenueFacility;
use App\Models\VenueSpecialHour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VenueFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_venue_profile_with_foundation_relations(): void
    {
        $owner = $this->organizer();
        $facility = VenueFacility::query()->create(['name' => 'WiFi', 'slug' => 'wifi', 'icon' => 'wifi']);
        $cuisine = CuisineType::query()->create(['name' => 'Italian', 'slug' => 'italian']);
        $paymentOption = PaymentOption::query()->create(['name' => 'Cash', 'slug' => 'cash']);

        $response = $this->actingAs($owner, 'sanctum')->postJson('/api/owner/venues', [
            'name' => 'Luna Lounge',
            'venue_type' => Venue::TYPE_LOUNGE,
            'description' => 'Late-night lounge with dinner service.',
            'city' => 'Pristina',
            'country' => 'Kosovo',
            'min_guests' => 2,
            'max_guests' => 8,
            'reservation_interval_minutes' => 30,
            'max_reservations_per_slot' => 12,
            'last_reservation_time' => '22:30:00',
            'facility_ids' => [$facility->id],
            'cuisine_type_ids' => [$cuisine->id],
            'payment_option_ids' => [$paymentOption->id],
            'images' => [
                ['image_path' => 'venues/luna/gallery-1.jpg', 'sort_order' => 1],
            ],
            'opening_hours' => [
                ['day_of_week' => 1, 'opens_at' => '10:00:00', 'closes_at' => '23:00:00', 'is_closed' => false],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.name', 'Luna Lounge')
            ->assertJsonPath('data.slug', 'luna-lounge')
            ->assertJsonPath('data.status', Venue::STATUS_ACTIVE)
            ->assertJsonPath('data.reservation_settings.max_reservations_per_slot', 12)
            ->assertJsonPath('data.reservation_settings.last_reservation_time', '22:30')
            ->assertJsonPath('data.facilities.0.slug', 'wifi')
            ->assertJsonPath('data.cuisine_types.0.slug', 'italian')
            ->assertJsonPath('data.payment_options.0.slug', 'cash')
            ->assertJsonPath('data.images.0.image_path', 'venues/luna/gallery-1.jpg')
            ->assertJsonPath('data.opening_hours.0.day_of_week', 1)
            ->assertJsonPath('data.opening_hours.0.opens_at', '10:00')
            ->assertJsonPath('data.opening_hours.0.closes_at', '23:00');

        $this->assertDatabaseHas('venues', [
            'user_id' => $owner->id,
            'slug' => 'luna-lounge',
            'status' => Venue::STATUS_ACTIVE,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->putJson('/api/owner/venues/luna-lounge', [
                'name' => 'Luna Lounge',
                'venue_type' => Venue::TYPE_LOUNGE,
                'city' => 'Pristina',
                'max_reservations_per_slot' => 6,
                'last_reservation_time' => '22:30:00',
                'opening_hours' => [
                    ['day_of_week' => 1, 'opens_at' => '10:00:00', 'closes_at' => '23:00:00', 'is_closed' => false],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.reservation_settings.max_reservations_per_slot', 6)
            ->assertJsonPath('data.reservation_settings.last_reservation_time', '22:30')
            ->assertJsonPath('data.opening_hours.0.opens_at', '10:00');

        $this->getJson('/api/venues/luna-lounge')
            ->assertOk()
            ->assertJsonPath('data.slug', 'luna-lounge');
    }

    public function test_unverified_owner_cannot_create_venue_profile(): void
    {
        $owner = User::factory()->unverified()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/owner/venues', [
                'name' => 'Unverified Lounge',
                'venue_type' => Venue::TYPE_LOUNGE,
                'city' => 'Pristina',
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Please verify your email address before managing restaurant or bar reservations.');

        $this->assertDatabaseMissing('venues', [
            'user_id' => $owner->id,
            'name' => 'Unverified Lounge',
        ]);
    }

    public function test_public_venue_endpoint_exposes_active_venues_only(): void
    {
        $owner = $this->organizer();
        $active = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Active Cafe',
            'slug' => 'active-cafe',
            'venue_type' => Venue::TYPE_CAFE,
            'city' => 'Pristina',
            'status' => Venue::STATUS_ACTIVE,
        ]);

        Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Draft Cafe',
            'slug' => 'draft-cafe',
            'venue_type' => Venue::TYPE_CAFE,
            'city' => 'Pristina',
            'status' => Venue::STATUS_DRAFT,
        ]);

        $response = $this->getJson('/api/venues');
        $ids = collect($response->json('data'))->pluck('id')->all();

        $response->assertOk();
        $this->assertContains($active->id, $ids);
        $this->assertCount(1, $ids);

        $this->getJson('/api/venues/draft-cafe')->assertNotFound();
    }

    public function test_public_venues_can_be_searched_filtered_and_sorted(): void
    {
        $owner = $this->organizer();
        $sushi = CuisineType::query()->create(['name' => 'Sushi', 'slug' => 'sushi']);
        $italian = CuisineType::query()->create(['name' => 'Italian', 'slug' => 'italian']);
        $parking = VenueFacility::query()->create(['name' => 'Parking', 'slug' => 'parking', 'icon' => 'parking-circle']);

        $zen = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Zen Table',
            'slug' => 'zen-table',
            'venue_type' => Venue::TYPE_RESTAURANT,
            'city' => 'Pristina',
            'status' => Venue::STATUS_ACTIVE,
            'featured' => false,
        ]);
        $bella = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Bella Cafe',
            'slug' => 'bella-cafe',
            'venue_type' => Venue::TYPE_CAFE,
            'city' => 'Prizren',
            'status' => Venue::STATUS_ACTIVE,
            'featured' => true,
        ]);

        $zen->cuisineTypes()->sync([$sushi->id]);
        $zen->facilities()->sync([$parking->id]);
        $bella->cuisineTypes()->sync([$italian->id]);

        $this->getJson('/api/venues?q=sushi')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'zen-table');

        $this->getJson('/api/venues?q=ZEN')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'zen-table');

        $this->getJson('/api/venues?q=prizren')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'bella-cafe');

        $this->getJson('/api/venues?q=CAFE')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'bella-cafe');

        $this->getJson('/api/venues?venue_type=cafe&city=Prizren')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'bella-cafe');

        $this->getJson('/api/venues?facility=parking')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'zen-table');

        $this->getJson('/api/venues?sort=az')
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'bella-cafe');
    }

    public function test_organizer_cannot_manage_another_owners_venue(): void
    {
        $owner = $this->organizer();
        $otherOwner = $this->organizer();
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Owner Bar',
            'slug' => 'owner-bar',
            'venue_type' => Venue::TYPE_BAR,
            'city' => 'Pristina',
        ]);

        $this->actingAs($otherOwner, 'sanctum')
            ->putJson("/api/owner/venues/{$venue->slug}", ['name' => 'Changed'])
            ->assertForbidden();
    }

    public function test_owner_can_manage_venue_availability_exceptions(): void
    {
        $owner = $this->organizer();
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Exception Bar',
            'slug' => 'exception-bar',
            'venue_type' => Venue::TYPE_BAR,
            'city' => 'Pristina',
        ]);

        $blackoutId = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/owner/venues/{$venue->slug}/blackout-dates", [
                'date' => '2026-12-25',
                'reason' => 'Christmas',
            ])
            ->assertCreated()
            ->assertJsonPath('data.date', '2026-12-25')
            ->assertJsonPath('data.reason', 'Christmas')
            ->json('data.id');

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/owner/venues/{$venue->slug}/blackout-dates")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $blackoutId);

        $specialId = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/owner/venues/{$venue->slug}/special-hours", [
                'date' => '2026-12-31',
                'opens_at' => '08:00',
                'closes_at' => '02:00',
                'is_closed' => false,
            ])
            ->assertCreated()
            ->assertJsonPath('data.date', '2026-12-31')
            ->assertJsonPath('data.opens_at', '08:00')
            ->assertJsonPath('data.closes_at', '02:00')
            ->json('data.id');

        $this->actingAs($owner, 'sanctum')
            ->putJson("/api/owner/venues/{$venue->slug}/special-hours/{$specialId}", [
                'date' => '2026-12-31',
                'is_closed' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_closed', true)
            ->assertJsonPath('data.opens_at', null)
            ->assertJsonPath('data.closes_at', null);

        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/owner/venues/{$venue->slug}/blackout-dates/{$blackoutId}")
            ->assertOk();

        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/owner/venues/{$venue->slug}/special-hours/{$specialId}")
            ->assertOk();

        $this->assertDatabaseMissing('venue_blackout_dates', ['id' => $blackoutId]);
        $this->assertDatabaseMissing('venue_special_hours', ['id' => $specialId]);
    }

    public function test_owner_cannot_manage_another_owners_availability_exceptions(): void
    {
        $owner = $this->organizer();
        $otherOwner = $this->organizer();
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Protected Bar',
            'slug' => 'protected-bar',
            'venue_type' => Venue::TYPE_BAR,
            'city' => 'Pristina',
        ]);
        $blackout = VenueBlackoutDate::query()->create([
            'venue_id' => $venue->id,
            'date' => '2026-07-04',
            'reason' => 'Private Event',
        ]);
        $specialHour = VenueSpecialHour::query()->create([
            'venue_id' => $venue->id,
            'date' => '2026-08-15',
            'is_closed' => true,
        ]);

        $this->actingAs($otherOwner, 'sanctum')
            ->getJson("/api/owner/venues/{$venue->slug}/blackout-dates")
            ->assertForbidden();

        $this->actingAs($otherOwner, 'sanctum')
            ->postJson("/api/owner/venues/{$venue->slug}/special-hours", [
                'date' => '2026-12-31',
                'opens_at' => '08:00',
                'closes_at' => '02:00',
            ])
            ->assertForbidden();

        $this->actingAs($otherOwner, 'sanctum')
            ->deleteJson("/api/owner/venues/{$venue->slug}/blackout-dates/{$blackout->id}")
            ->assertForbidden();

        $this->actingAs($otherOwner, 'sanctum')
            ->deleteJson("/api/owner/venues/{$venue->slug}/special-hours/{$specialHour->id}")
            ->assertForbidden();
    }

    public function test_owner_can_list_upload_reorder_and_delete_venue_images(): void
    {
        Storage::fake('public');

        $owner = $this->organizer();
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Gallery Lounge',
            'slug' => 'gallery-lounge',
            'venue_type' => Venue::TYPE_LOUNGE,
            'city' => 'Pristina',
        ]);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/owner/venues')
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'gallery-lounge');

        $first = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/owner/venues/{$venue->slug}/images", [
                'image' => UploadedFile::fake()->image('first.jpg', 1200, 800),
            ])
            ->assertOk()
            ->json('data.images.0');

        $second = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/owner/venues/{$venue->slug}/images", [
                'image' => UploadedFile::fake()->image('second.jpg', 1200, 800),
            ])
            ->assertOk()
            ->json('data.images.1');

        Storage::disk('public')->assertExists($first['image_path']);
        Storage::disk('public')->assertExists($second['image_path']);

        $this->actingAs($owner, 'sanctum')
            ->putJson("/api/owner/venues/{$venue->slug}/images/reorder", [
                'images' => [
                    ['id' => $second['id'], 'sort_order' => 0],
                    ['id' => $first['id'], 'sort_order' => 1],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.images.0.id', $second['id']);

        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/owner/venue-images/{$first['id']}")
            ->assertOk();

        Storage::disk('public')->assertMissing($first['image_path']);
    }

    public function test_venue_lookup_endpoints_return_seeded_options(): void
    {
        VenueFacility::query()->create(['name' => 'Parking', 'slug' => 'parking', 'icon' => 'parking-circle']);
        CuisineType::query()->create(['name' => 'Sushi', 'slug' => 'sushi']);
        PaymentOption::query()->create(['name' => 'Apple Pay', 'slug' => 'apple-pay']);

        $this->getJson('/api/venue-facilities')->assertOk()->assertJsonPath('data.0.slug', 'parking');
        $this->getJson('/api/cuisine-types')->assertOk()->assertJsonPath('data.0.slug', 'sushi');
        $this->getJson('/api/payment-options')->assertOk()->assertJsonPath('data.0.slug', 'apple-pay');
    }

    private function organizer(): User
    {
        return User::factory()->create([
            'role' => User::ROLE_ORGANIZER,
            'status' => User::STATUS_ACTIVE,
            'organizer_status' => User::ORGANIZER_STATUS_APPROVED,
        ]);
    }
}
