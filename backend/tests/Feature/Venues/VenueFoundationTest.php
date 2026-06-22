<?php

namespace Tests\Feature\Venues;

use App\Models\CuisineType;
use App\Models\PaymentOption;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueFacility;
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
            'status' => Venue::STATUS_ACTIVE,
            'reservation_enabled' => true,
            'min_guests' => 2,
            'max_guests' => 8,
            'reservation_interval_minutes' => 30,
            'last_reservation_time' => '22:30',
            'facility_ids' => [$facility->id],
            'cuisine_type_ids' => [$cuisine->id],
            'payment_option_ids' => [$paymentOption->id],
            'images' => [
                ['image_path' => 'venues/luna/gallery-1.jpg', 'sort_order' => 1],
            ],
            'opening_hours' => [
                ['day_of_week' => 1, 'opens_at' => '10:00', 'closes_at' => '23:00', 'is_closed' => false],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.name', 'Luna Lounge')
            ->assertJsonPath('data.slug', 'luna-lounge')
            ->assertJsonPath('data.reservation_settings.reservation_enabled', true)
            ->assertJsonPath('data.facilities.0.slug', 'wifi')
            ->assertJsonPath('data.cuisine_types.0.slug', 'italian')
            ->assertJsonPath('data.payment_options.0.slug', 'cash')
            ->assertJsonPath('data.images.0.image_path', 'venues/luna/gallery-1.jpg')
            ->assertJsonPath('data.opening_hours.0.day_of_week', 1);

        $this->assertDatabaseHas('venues', [
            'user_id' => $owner->id,
            'slug' => 'luna-lounge',
        ]);
    }

    public function test_public_venue_endpoint_only_exposes_active_venues(): void
    {
        $owner = $this->organizer();
        $active = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Active Cafe',
            'slug' => 'active-cafe',
            'venue_type' => Venue::TYPE_CAFE,
            'city' => 'Pristina',
            'status' => Venue::STATUS_ACTIVE,
            'reservation_enabled' => true,
        ]);

        Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Draft Cafe',
            'slug' => 'draft-cafe',
            'venue_type' => Venue::TYPE_CAFE,
            'city' => 'Pristina',
            'status' => Venue::STATUS_DRAFT,
            'reservation_enabled' => true,
        ]);

        Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Disabled Cafe',
            'slug' => 'disabled-cafe',
            'venue_type' => Venue::TYPE_CAFE,
            'city' => 'Pristina',
            'status' => Venue::STATUS_ACTIVE,
            'reservation_enabled' => false,
        ]);

        $response = $this->getJson('/api/venues');
        $ids = collect($response->json('data'))->pluck('id')->all();

        $response->assertOk();
        $this->assertContains($active->id, $ids);
        $this->assertCount(1, $ids);

        $this->getJson('/api/venues/draft-cafe')->assertNotFound();
        $this->getJson('/api/venues/disabled-cafe')->assertNotFound();
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
            'reservation_enabled' => true,
            'featured' => false,
        ]);
        $bella = Venue::query()->create([
            'user_id' => $owner->id,
            'name' => 'Bella Cafe',
            'slug' => 'bella-cafe',
            'venue_type' => Venue::TYPE_CAFE,
            'city' => 'Prizren',
            'status' => Venue::STATUS_ACTIVE,
            'reservation_enabled' => true,
            'featured' => true,
        ]);

        $zen->cuisineTypes()->sync([$sushi->id]);
        $zen->facilities()->sync([$parking->id]);
        $bella->cuisineTypes()->sync([$italian->id]);

        $this->getJson('/api/venues?q=sushi')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'zen-table');

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
