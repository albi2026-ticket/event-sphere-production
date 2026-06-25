<?php

namespace App\Http\Controllers\Api\Owner;

use App\Http\Controllers\Controller;
use App\Http\Resources\VenueBlackoutDateResource;
use App\Models\Venue;
use App\Models\VenueBlackoutDate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class OwnerVenueBlackoutDateController extends Controller
{
    public function index(Request $request, Venue $venue): AnonymousResourceCollection
    {
        abort_unless($request->user()->canManageVenue($venue), 403);

        return VenueBlackoutDateResource::collection(
            $venue->blackoutDates()->orderBy('date')->get()
        );
    }

    public function store(Request $request, Venue $venue): VenueBlackoutDateResource
    {
        abort_unless($request->user()->canManageVenue($venue), 403);
        $this->ensureVerifiedOwner($request);

        $payload = $request->validate([
            'date' => [
                'required',
                'date_format:Y-m-d',
                Rule::unique('venue_blackout_dates', 'date')->where('venue_id', $venue->id),
            ],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $blackoutDate = $venue->blackoutDates()->create($payload);

        return new VenueBlackoutDateResource($blackoutDate);
    }

    public function destroy(Request $request, Venue $venue, VenueBlackoutDate $blackoutDate): JsonResponse
    {
        abort_unless($request->user()->canManageVenue($venue), 403);
        $this->ensureVerifiedOwner($request);
        abort_unless((int) $blackoutDate->venue_id === (int) $venue->id, 404);

        $blackoutDate->delete();

        return response()->json(['message' => 'Blackout date removed.']);
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
