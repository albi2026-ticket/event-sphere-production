<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VenueResource;
use App\Models\Venue;
use App\Services\Reservations\ReservationAvailabilityService;
use App\Support\Performance\DeepControllerProfiler as Profiler;
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
        Profiler::begin('VenueController@index');

        $query = Profiler::section('Build Venue::query with eager loads', fn () => Venue::query()
            ->with([
                'images:id,venue_id,image_path,disk,path,sort_order,created_at,updated_at',
                'facilities:id,name,slug,icon',
                'cuisineTypes:id,name,slug',
                'paymentOptions:id,name,slug',
                'openingHours:id,venue_id,day_of_week,opens_at,closes_at,is_closed',
            ])
            ->publicDiscovery());

        if ($request->filled('q')) {
            $term = Profiler::section('Normalize venue search term', fn (): string => mb_strtolower($request->string('q')->toString()));
            Profiler::section('Apply q filter', function () use ($query, $term): void {
                $like = "%{$term}%";
                $query->where(function (Builder $query) use ($like): void {
                    $query->whereRaw('LOWER(name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(city) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(venue_type) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(description) LIKE ?', [$like])
                        ->orWhereHas('cuisineTypes', fn (Builder $query) => $query
                            ->whereRaw('LOWER(name) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(slug) LIKE ?', [$like]));
                });
            });
        }

        if ($request->filled('city')) {
            Profiler::section('Apply city filter', function () use ($query, $request): void {
                $city = '%'.mb_strtolower($request->string('city')->toString()).'%';
                $query->whereRaw('LOWER(city) LIKE ?', [$city]);
            });
        }

        if ($request->filled('venue_type')) {
            Profiler::section('Apply venue_type filter', fn () => $query->where('venue_type', $request->string('venue_type')->toString()));
        }

        if ($request->filled('cuisine')) {
            Profiler::section('Apply cuisine filter', function () use ($query, $request): void {
                $cuisine = $request->string('cuisine')->toString();
                $like = '%'.mb_strtolower($cuisine).'%';
                $query->whereHas('cuisineTypes', fn (Builder $query) => $query
                    ->where('slug', $cuisine)
                    ->orWhereRaw('LOWER(name) LIKE ?', [$like]));
            });
        }

        if ($request->filled('facility')) {
            Profiler::section('Apply facility filter', function () use ($query, $request): void {
                $facility = $request->string('facility')->toString();
                $like = '%'.mb_strtolower($facility).'%';
                $query->whereHas('facilities', fn (Builder $query) => $query
                    ->where('slug', $facility)
                    ->orWhereRaw('LOWER(name) LIKE ?', [$like]));
            });
        }

        if ($request->boolean('featured')) {
            Profiler::section('Apply featured filter', fn () => $query->where('featured', true));
        }

        Profiler::section('Apply venue sort', fn () => match ($request->string('sort', 'featured')->toString()) {
            'az' => $query->orderBy('name'),
            'newest' => $query->latest(),
            default => $query->orderByDesc('featured')->latest(),
        });

        $paginated = Profiler::section('Venue pagination', fn () => $query->paginate($request->integer('per_page', 15)));

        return Profiler::section('VenueResource collection create', fn (): AnonymousResourceCollection => VenueResource::collection($paginated));
    }

    public function show(Venue $venue): VenueResource
    {
        Profiler::begin('VenueController@show');

        Profiler::section('Assert venue active', fn () => abort_unless($venue->status === Venue::STATUS_ACTIVE, 404));

        $venue = Profiler::section('Venue eager load details', fn (): Venue => $venue->load(['owner', 'images', 'facilities', 'cuisineTypes', 'paymentOptions', 'openingHours', 'specialHours', 'blackoutDates']));

        return Profiler::section('VenueResource create', fn (): VenueResource => new VenueResource($venue));
    }

    public function availability(Request $request, Venue $venue, ReservationAvailabilityService $availability): JsonResponse
    {
        Profiler::begin('VenueController@availability');

        Profiler::section('Assert venue active', fn () => abort_unless($venue->status === Venue::STATUS_ACTIVE, 404));

        $payload = Profiler::section('Validate availability payload', fn (): array => $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ]));

        $date = Profiler::section('Parse availability date', fn (): Carbon => Carbon::createFromFormat('Y-m-d', $payload['date'], config('app.timezone'))->startOfDay());
        $bookingHorizonError = Profiler::section('ReservationAvailabilityService::bookingHorizonError', fn () => $availability->bookingHorizonError($venue, $date));

        if ($bookingHorizonError) {
            Profiler::section('Throw booking horizon validation error', fn () => throw ValidationException::withMessages([
                $bookingHorizonError['field'] => [$bookingHorizonError['message']],
            ]));
        }

        $slots = Profiler::section('ReservationAvailabilityService::availableSlots', fn (): array => $availability->availableSlots($venue, $date));

        return Profiler::section('Return response()->json availability', fn (): JsonResponse => response()->json([
            'date' => $date->format('Y-m-d'),
            'slots' => $slots,
        ]));
    }
}
