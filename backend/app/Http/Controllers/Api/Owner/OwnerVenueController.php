<?php

namespace App\Http\Controllers\Api\Owner;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Venues\StoreVenueRequest;
use App\Http\Requests\Api\Venues\UpdateVenueRequest;
use App\Http\Resources\VenueResource;
use App\Models\Venue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class OwnerVenueController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()->isOwner(), 403);

        $query = Venue::query()
            ->where('user_id', $request->user()->id)
            ->with(['images', 'facilities', 'cuisineTypes', 'paymentOptions', 'openingHours'])
            ->latest();

        return VenueResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreVenueRequest $request): VenueResource
    {
        $payload = $this->venuePayload($request->validated(), $request->user()->id);

        $venue = Venue::create($payload);
        $this->syncProfileRelations($venue, $request->validated());

        return new VenueResource($venue->fresh()->load(['images', 'facilities', 'cuisineTypes', 'paymentOptions', 'openingHours']));
    }

    public function update(UpdateVenueRequest $request, Venue $venue): VenueResource
    {
        $venue->update($this->venuePayload($request->validated(), $venue->user_id, true, $venue));
        $this->syncProfileRelations($venue, $request->validated());

        return new VenueResource($venue->fresh()->load(['images', 'facilities', 'cuisineTypes', 'paymentOptions', 'openingHours']));
    }

    public function destroy(Request $request, Venue $venue): JsonResponse
    {
        abort_unless($request->user()->canManageVenue($venue), 403);
        $this->ensureVerifiedOwner($request);

        $venue->delete();

        return response()->json(['message' => 'Venue deleted.']);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    protected function venuePayload(array $payload, int $ownerId, bool $partial = false, ?Venue $venue = null): array
    {
        $payload = Arr::except($payload, [
            'facility_ids',
            'cuisine_type_ids',
            'payment_option_ids',
            'images',
            'opening_hours',
        ]);

        if ((! $partial || array_key_exists('name', $payload)) && ! array_key_exists('slug', $payload)) {
            $payload['slug'] = $this->uniqueSlug((string) $payload['name'], $venue);
        }

        $payload['user_id'] = $ownerId;

        if (! $partial) {
            $payload['status'] = $payload['status'] ?? Venue::STATUS_ACTIVE;
            $payload['featured'] = $payload['featured'] ?? false;
            $payload['min_guests'] = $payload['min_guests'] ?? 1;
            $payload['max_guests'] = $payload['max_guests'] ?? 10;
            $payload['reservation_interval_minutes'] = $payload['reservation_interval_minutes'] ?? 30;
            $payload['max_reservations_per_slot'] = $payload['max_reservations_per_slot'] ?? 10;
            $payload['booking_horizon_days'] = $payload['booking_horizon_days'] ?? Venue::DEFAULT_BOOKING_HORIZON_DAYS;
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function syncProfileRelations(Venue $venue, array $payload): void
    {
        if (array_key_exists('facility_ids', $payload)) {
            $venue->facilities()->sync($payload['facility_ids']);
        }

        if (array_key_exists('cuisine_type_ids', $payload)) {
            $venue->cuisineTypes()->sync($payload['cuisine_type_ids']);
        }

        if (array_key_exists('payment_option_ids', $payload)) {
            $venue->paymentOptions()->sync($payload['payment_option_ids']);
        }

        if (array_key_exists('images', $payload)) {
            $venue->images()->delete();
            $venue->images()->createMany(collect($payload['images'])->map(fn (array $image) => [
                'image_path' => $image['image_path'],
                'sort_order' => $image['sort_order'] ?? 0,
            ])->all());
        }

        if (array_key_exists('opening_hours', $payload)) {
            $venue->openingHours()->delete();
            $venue->openingHours()->createMany(collect($payload['opening_hours'])->map(fn (array $hours) => [
                'day_of_week' => $hours['day_of_week'],
                'opens_at' => ($hours['is_closed'] ?? false) ? null : ($hours['opens_at'] ?? null),
                'closes_at' => ($hours['is_closed'] ?? false) ? null : ($hours['closes_at'] ?? null),
                'is_closed' => $hours['is_closed'] ?? false,
            ])->all());
        }
    }

    protected function uniqueSlug(string $name, ?Venue $venue = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $counter = 2;

        while (Venue::query()
            ->where('slug', $slug)
            ->when($venue, fn ($query) => $query->whereKeyNot($venue->id))
            ->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    protected function ensureVerifiedOwner(Request $request): void
    {
        abort_unless(
            $request->user()?->hasVerifiedEmail(),
            403,
            'Please verify your email address before managing restaurant or bar reservations.',
        );
    }
}
