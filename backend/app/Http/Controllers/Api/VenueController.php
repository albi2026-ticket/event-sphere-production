<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VenueResource;
use App\Models\Venue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class VenueController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Venue::query()
            ->with(['images', 'facilities', 'cuisineTypes', 'paymentOptions', 'openingHours'])
            ->publicDiscovery();

        if ($request->filled('q')) {
            $term = $request->string('q')->toString();
            $query->where(function (Builder $query) use ($term): void {
                $query->where('name', 'like', "%{$term}%")
                    ->orWhere('city', 'like', "%{$term}%")
                    ->orWhereHas('cuisineTypes', fn (Builder $query) => $query
                        ->where('name', 'like', "%{$term}%")
                        ->orWhere('slug', 'like', "%{$term}%"));
            });
        }

        if ($request->filled('city')) {
            $city = $request->string('city')->toString();
            $query->where('city', 'like', "%{$city}%");
        }

        if ($request->filled('venue_type')) {
            $query->where('venue_type', $request->string('venue_type')->toString());
        }

        if ($request->filled('cuisine')) {
            $cuisine = $request->string('cuisine')->toString();
            $query->whereHas('cuisineTypes', fn (Builder $query) => $query
                ->where('slug', $cuisine)
                ->orWhere('name', 'like', "%{$cuisine}%"));
        }

        if ($request->filled('facility')) {
            $facility = $request->string('facility')->toString();
            $query->whereHas('facilities', fn (Builder $query) => $query
                ->where('slug', $facility)
                ->orWhere('name', 'like', "%{$facility}%"));
        }

        if ($request->boolean('featured')) {
            $query->where('featured', true);
        }

        match ($request->string('sort', 'featured')->toString()) {
            'az' => $query->orderBy('name'),
            'newest' => $query->latest(),
            default => $query->orderByDesc('featured')->latest(),
        };

        return VenueResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function show(Venue $venue): VenueResource
    {
        abort_unless($venue->status === Venue::STATUS_ACTIVE && $venue->reservation_enabled, 404);

        return new VenueResource($venue->load(['owner', 'images', 'facilities', 'cuisineTypes', 'paymentOptions', 'openingHours']));
    }
}
