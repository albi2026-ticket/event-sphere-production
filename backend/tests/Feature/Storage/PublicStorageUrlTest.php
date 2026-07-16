<?php

namespace Tests\Feature\Storage;

use App\Models\EventImage;
use App\Models\VenueImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicStorageUrlTest extends TestCase
{
    use RefreshDatabase;

    public function test_event_and_venue_images_resolve_supabase_bucket_urls(): void
    {
        config([
            'services.supabase.storage_public_url' => 'https://PROJECT.supabase.co/storage/v1/object/public',
            'services.supabase.event_images_bucket' => 'event-images',
            'services.supabase.venue_images_bucket' => 'venue-images',
        ]);

        $legacyEventImage = new EventImage([
            'disk' => 'supabase',
            'path' => '28/file.jpg',
        ]);
        $eventImage = new EventImage([
            'disk' => 'supabase',
            'path' => 'event-images/28/file.jpg',
        ]);
        $venueImage = new VenueImage([
            'disk' => 'supabase',
            'path' => 'venue-images/4/file.jpg',
            'image_path' => 'venue-images/4/file.jpg',
        ]);

        $this->assertSame(
            'https://PROJECT.supabase.co/storage/v1/object/public/event-images/28/file.jpg',
            $legacyEventImage->publicUrl(),
        );
        $this->assertSame(
            'https://PROJECT.supabase.co/storage/v1/object/public/event-images/28/file.jpg',
            $eventImage->publicUrl(),
        );
        $this->assertSame(
            'https://PROJECT.supabase.co/storage/v1/object/public/venue-images/4/file.jpg',
            $venueImage->publicUrl(),
        );
    }
}
