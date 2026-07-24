<?php

namespace App\Console\Commands;

use App\Models\VenueImage;
use Illuminate\Console\Command;

class VerifyVenueImageStorageUrl extends Command
{
    protected $signature = 'storage:verify-venue-image-url';

    protected $description = 'Verify that the first venue image resolves to a Supabase Storage public URL.';

    public function handle(): int
    {
        $image = VenueImage::query()->orderBy('id')->first();

        if (! $image) {
            $this->warn('No venue images found.');

            return self::SUCCESS;
        }

        $url = $image->publicUrl();
        $expectedPrefix = rtrim((string) config('services.supabase.storage_public_url'), '/')
            .'/'.trim((string) config('services.supabase.venue_images_bucket', 'venue-images'), '/').'/';

        $this->line("VenueImage ID: {$image->id}");
        $this->line("Path: {$image->path}");
        $this->line("Resolved URL: {$url}");

        if (! str_starts_with($url, $expectedPrefix)) {
            $this->error("Venue image URL does not start with expected Supabase prefix [{$expectedPrefix}].");

            return self::FAILURE;
        }

        $this->info('Venue image URL resolves to Supabase Storage.');

        return self::SUCCESS;
    }
}
