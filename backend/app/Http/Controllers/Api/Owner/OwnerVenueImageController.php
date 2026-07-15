<?php

namespace App\Http\Controllers\Api\Owner;

use App\Http\Controllers\Controller;
use App\Http\Resources\VenueResource;
use App\Models\Venue;
use App\Models\VenueImage;
use App\Services\Storage\PublicStorageUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class OwnerVenueImageController extends Controller
{
    public function store(Request $request, Venue $venue): VenueResource
    {
        abort_unless($request->user()->canManageVenue($venue), 403);
        $this->ensureVerifiedOwner($request);

        $payload = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $disk = config('filesystems.venue_images_disk', 'public');
        $directory = $disk === 'supabase' ? "venues/{$venue->id}" : "venue-images/{$venue->id}";
        $path = $payload['image']->store($directory, $disk);

        $venue->images()->create([
            'disk' => $disk,
            'path' => $path,
            'image_path' => $path,
            'sort_order' => $payload['sort_order'] ?? ($venue->images()->max('sort_order') ?? 0) + 1,
        ]);

        return new VenueResource($venue->fresh()->load(['images', 'facilities', 'cuisineTypes', 'paymentOptions', 'openingHours']));
    }

    public function reorder(Request $request, Venue $venue): VenueResource
    {
        abort_unless($request->user()->canManageVenue($venue), 403);
        $this->ensureVerifiedOwner($request);

        $payload = $request->validate([
            'images' => ['required', 'array'],
            'images.*.id' => ['required', 'integer', Rule::exists(VenueImage::class, 'id')->where('venue_id', $venue->id)],
            'images.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        foreach ($payload['images'] as $image) {
            VenueImage::query()
                ->whereKey($image['id'])
                ->where('venue_id', $venue->id)
                ->update(['sort_order' => $image['sort_order']]);
        }

        return new VenueResource($venue->fresh()->load(['images', 'facilities', 'cuisineTypes', 'paymentOptions', 'openingHours']));
    }

    public function destroy(Request $request, VenueImage $venueImage): JsonResponse
    {
        abort_unless($request->user()->canManageVenue($venueImage->venue), 403);
        $this->ensureVerifiedOwner($request);

        if ($venueImage->disk && $venueImage->path) {
            if ($venueImage->disk === 'public' && app(PublicStorageUrl::class)->hasSupabasePublicUrl()) {
                Storage::disk('supabase')->delete(app(PublicStorageUrl::class)->objectPath($venueImage->path));
            } else {
                Storage::disk($venueImage->disk)->delete($venueImage->path);
            }
        } elseif (! str_starts_with($venueImage->image_path, 'http') && ! str_starts_with($venueImage->image_path, 'data:')) {
            Storage::disk('public')->delete($venueImage->image_path);
        }

        $venueImage->delete();

        return response()->json(['message' => 'Venue image deleted.']);
    }

    protected function ensureVerifiedOwner(Request $request): void
    {
        abort_unless(
            $request->user()?->hasVerifiedEmail(),
            403,
            __('validation.custom.verify_email_venue'),
        );
    }
}
