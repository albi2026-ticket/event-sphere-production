<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VenueResource;
use App\Models\Venue;
use App\Services\Reservations\ReservationAvailabilityService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class VenueController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Venue::query()
            ->with([
                'images:id,venue_id,image_path,disk,path,sort_order,created_at,updated_at',
                'facilities:id,name,slug,icon',
                'cuisineTypes:id,name,slug',
                'paymentOptions:id,name,slug',
                'openingHours:id,venue_id,day_of_week,opens_at,closes_at,is_closed',
            ])
            ->publicDiscovery();

        if ($request->filled('q')) {
            $term = mb_strtolower($request->string('q')->toString());
            $query->where(function (Builder $query) use ($term): void {
                $like = "%{$term}%";
                $query->whereRaw('LOWER(name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(city) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(venue_type) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(description) LIKE ?', [$like])
                    ->orWhereHas('cuisineTypes', fn (Builder $query) => $query
                        ->whereRaw('LOWER(name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(slug) LIKE ?', [$like]));
            });
        }

        if ($request->filled('city')) {
            $city = '%'.mb_strtolower($request->string('city')->toString()).'%';
            $query->whereRaw('LOWER(city) LIKE ?', [$city]);
        }

        if ($request->filled('venue_type')) {
            $query->where('venue_type', $request->string('venue_type')->toString());
        }

        if ($request->filled('cuisine')) {
            $cuisine = $request->string('cuisine')->toString();
            $like = '%'.mb_strtolower($cuisine).'%';
            $query->whereHas('cuisineTypes', fn (Builder $query) => $query
                ->where('slug', $cuisine)
                ->orWhereRaw('LOWER(name) LIKE ?', [$like]));
        }

        if ($request->filled('facility')) {
            $facility = $request->string('facility')->toString();
            $like = '%'.mb_strtolower($facility).'%';
            $query->whereHas('facilities', fn (Builder $query) => $query
                ->where('slug', $facility)
                ->orWhereRaw('LOWER(name) LIKE ?', [$like]));
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
        abort_unless($venue->status === Venue::STATUS_ACTIVE, 404);

        return new VenueResource($venue->load(['owner', 'images', 'facilities', 'cuisineTypes', 'paymentOptions', 'openingHours', 'specialHours', 'blackoutDates']));
    }

    public function availability(Request $request, Venue $venue, ReservationAvailabilityService $availability): JsonResponse
    {
        abort_unless($venue->status === Venue::STATUS_ACTIVE, 404);

        $payload = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $date = Carbon::createFromFormat('Y-m-d', $payload['date'], config('app.timezone'))->startOfDay();
        $bookingHorizonError = $availability->bookingHorizonError($venue, $date);

        if ($bookingHorizonError) {
            throw ValidationException::withMessages([
                $bookingHorizonError['field'] => [$bookingHorizonError['message']],
            ]);
        }

        return response()->json([
            'date' => $date->format('Y-m-d'),
            'slots' => $availability->availableSlots($venue, $date),
        ]);
    }
}
