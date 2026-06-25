<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\VenueResource;
use App\Models\AuditLog;
use App\Models\CuisineType;
use App\Models\PaymentOption;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueFacility;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminVenueController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $this->validateIndex($request);

        $query = Venue::query()
            ->with('owner')
            ->withCount('reservations')
            ->latest();

        $this->applyFilters($query, $validated);

        return VenueResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function show(Venue $venue): VenueResource
    {
        return new VenueResource($venue
            ->load(['owner', 'images', 'facilities', 'cuisineTypes', 'paymentOptions', 'openingHours'])
            ->loadCount('reservations'));
    }

    public function update(Request $request, Venue $venue): VenueResource
    {
        $validated = $this->validatePayload($request, $venue);

        $venue->update($this->venuePayload($validated, $venue));
        $this->syncProfileRelations($venue, $validated);

        AuditLog::record($request->user(), 'venue.updated', $venue, array_keys($validated), $request->ip());

        return new VenueResource($venue->fresh()
            ->load(['owner', 'images', 'facilities', 'cuisineTypes', 'paymentOptions', 'openingHours'])
            ->loadCount('reservations'));
    }

    public function activate(Request $request, Venue $venue): VenueResource
    {
        $venue->update(['status' => Venue::STATUS_ACTIVE]);
        AuditLog::record($request->user(), 'venue.activated', $venue, ['name' => $venue->name], $request->ip());

        return new VenueResource($venue->fresh(['owner'])->loadCount('reservations'));
    }

    public function deactivate(Request $request, Venue $venue): VenueResource
    {
        $venue->update(['status' => Venue::STATUS_INACTIVE]);
        AuditLog::record($request->user(), 'venue.deactivated', $venue, ['name' => $venue->name], $request->ip());

        return new VenueResource($venue->fresh(['owner'])->loadCount('reservations'));
    }

    public function destroy(Request $request, Venue $venue): JsonResponse
    {
        AuditLog::record($request->user(), 'venue.deleted', $venue, ['name' => $venue->name], $request->ip());
        $venue->delete();

        return response()->json(['message' => 'Venue deleted.']);
    }

    /**
     * @return array<string, mixed>
     */
    protected function validateIndex(Request $request): array
    {
        return $request->validate([
            'venue_type' => ['sometimes', Rule::in([Venue::TYPE_RESTAURANT, Venue::TYPE_BAR, Venue::TYPE_LOUNGE, Venue::TYPE_CAFE])],
            'status' => ['sometimes', Rule::in([Venue::STATUS_DRAFT, Venue::STATUS_ACTIVE, Venue::STATUS_INACTIVE])],
            'city' => ['sometimes', 'string', 'max:255'],
            'owner_id' => ['sometimes', 'integer', Rule::exists(User::class, 'id')],
            'owner' => ['sometimes', 'string', 'max:255'],
            'q' => ['sometimes', 'string', 'max:255'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    protected function applyFilters(Builder $query, array $filters): void
    {
        $query
            ->when($filters['venue_type'] ?? null, fn (Builder $query, string $type) => $query->where('venue_type', $type))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['city'] ?? null, fn (Builder $query, string $city) => $query->where('city', 'like', "%{$city}%"))
            ->when($filters['owner_id'] ?? null, fn (Builder $query, int $ownerId) => $query->where('user_id', $ownerId))
            ->when($filters['owner'] ?? null, fn (Builder $query, string $owner) => $query->whereHas('owner', fn (Builder $query) => $query
                ->where('name', 'like', "%{$owner}%")
                ->orWhere('email', 'like', "%{$owner}%")))
            ->when($filters['q'] ?? null, fn (Builder $query, string $q) => $query->where(function (Builder $query) use ($q): void {
                $query->where('name', 'like', "%{$q}%")
                    ->orWhere('description', 'like', "%{$q}%")
                    ->orWhere('city', 'like', "%{$q}%")
                    ->orWhereHas('owner', fn (Builder $query) => $query
                        ->where('name', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%"));
            }));
    }

    /**
     * @return array<string, mixed>
     */
    protected function validatePayload(Request $request, Venue $venue): array
    {
        return $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique(Venue::class, 'slug')->ignore($venue->id)],
            'description' => ['nullable', 'string'],
            'venue_type' => ['sometimes', Rule::in([Venue::TYPE_RESTAURANT, Venue::TYPE_BAR, Venue::TYPE_LOUNGE, Venue::TYPE_CAFE])],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:2048'],
            'address' => ['nullable', 'string'],
            'city' => ['sometimes', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'logo_image' => ['nullable', 'string', 'max:2048'],
            'status' => ['sometimes', Rule::in([Venue::STATUS_DRAFT, Venue::STATUS_ACTIVE, Venue::STATUS_INACTIVE])],
            'featured' => ['sometimes', 'boolean'],
            'min_guests' => ['sometimes', 'integer', 'min:1', 'max:1000'],
            'max_guests' => ['sometimes', 'integer', 'min:1', 'max:1000', 'gte:min_guests'],
            'reservation_interval_minutes' => ['sometimes', 'integer', Rule::in([15, 30, 45, 60, 90, 120])],
            'last_reservation_time' => ['nullable', 'date_format:H:i'],
            'facebook_url' => ['nullable', 'url', 'max:2048'],
            'instagram_url' => ['nullable', 'url', 'max:2048'],
            'tiktok_url' => ['nullable', 'url', 'max:2048'],
            'facility_ids' => ['sometimes', 'array'],
            'facility_ids.*' => ['integer', Rule::exists(VenueFacility::class, 'id')],
            'cuisine_type_ids' => ['sometimes', 'array'],
            'cuisine_type_ids.*' => ['integer', Rule::exists(CuisineType::class, 'id')],
            'payment_option_ids' => ['sometimes', 'array'],
            'payment_option_ids.*' => ['integer', Rule::exists(PaymentOption::class, 'id')],
            'images' => ['sometimes', 'array'],
            'images.*.image_path' => ['required_with:images', 'string', 'max:2048'],
            'images.*.sort_order' => ['sometimes', 'integer', 'min:0'],
            'opening_hours' => ['sometimes', 'array', 'max:7'],
            'opening_hours.*.day_of_week' => ['required_with:opening_hours', 'integer', 'between:0,6', 'distinct'],
            'opening_hours.*.opens_at' => ['nullable', 'date_format:H:i'],
            'opening_hours.*.closes_at' => ['nullable', 'date_format:H:i'],
            'opening_hours.*.is_closed' => ['sometimes', 'boolean'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    protected function venuePayload(array $payload, Venue $venue): array
    {
        $payload = Arr::except($payload, [
            'facility_ids',
            'cuisine_type_ids',
            'payment_option_ids',
            'images',
            'opening_hours',
        ]);

        if (isset($payload['name']) && ! isset($payload['slug'])) {
            $payload['slug'] = $this->uniqueSlug((string) $payload['name'], $venue);
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
            ->when($venue, fn (Builder $query) => $query->whereKeyNot($venue->id))
            ->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
