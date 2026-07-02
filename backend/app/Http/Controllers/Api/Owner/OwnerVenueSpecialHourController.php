<?php

namespace App\Http\Controllers\Api\Owner;

use App\Http\Controllers\Controller;
use App\Http\Resources\VenueSpecialHourResource;
use App\Models\Venue;
use App\Models\VenueSpecialHour;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class OwnerVenueSpecialHourController extends Controller
{
    public function index(Request $request, Venue $venue): AnonymousResourceCollection
    {
        abort_unless($request->user()->canManageVenue($venue), 403);

        return VenueSpecialHourResource::collection(
            $venue->specialHours()->orderBy('date')->get()
        );
    }

    public function store(Request $request, Venue $venue): VenueSpecialHourResource
    {
        abort_unless($request->user()->canManageVenue($venue), 403);
        $this->ensureVerifiedOwner($request);

        $payload = $this->validatedPayload($request, [
            Rule::unique('venue_special_hours', 'date')->where('venue_id', $venue->id),
        ]);

        $specialHour = $venue->specialHours()->create($payload);

        return new VenueSpecialHourResource($specialHour);
    }

    public function update(Request $request, Venue $venue, VenueSpecialHour $specialHour): VenueSpecialHourResource
    {
        abort_unless($request->user()->canManageVenue($venue), 403);
        $this->ensureVerifiedOwner($request);
        abort_unless((int) $specialHour->venue_id === (int) $venue->id, 404);

        $payload = $this->validatedPayload($request, [
            Rule::unique('venue_special_hours', 'date')
                ->where('venue_id', $venue->id)
                ->ignore($specialHour->id),
        ]);

        $specialHour->update($payload);

        return new VenueSpecialHourResource($specialHour->fresh());
    }

    public function destroy(Request $request, Venue $venue, VenueSpecialHour $specialHour): JsonResponse
    {
        abort_unless($request->user()->canManageVenue($venue), 403);
        $this->ensureVerifiedOwner($request);
        abort_unless((int) $specialHour->venue_id === (int) $venue->id, 404);

        $specialHour->delete();

        return response()->json(['message' => 'Special hours removed.']);
    }

    protected function ensureVerifiedOwner(Request $request): void
    {
        abort_unless(
            $request->user()?->hasVerifiedEmail(),
            403,
            __('validation.custom.verify_email_venue'),
        );
    }

    /**
     * @param  array<int, mixed>  $dateRules
     * @return array<string, mixed>
     */
    private function validatedPayload(Request $request, array $dateRules): array
    {
        $payload = $request->validate([
            'date' => array_merge(['required', 'date_format:Y-m-d'], $dateRules),
            'opens_at' => ['nullable', 'date_format:H:i'],
            'closes_at' => ['nullable', 'date_format:H:i'],
            'is_closed' => ['sometimes', 'boolean'],
        ]);

        $isClosed = (bool) ($payload['is_closed'] ?? false);

        if (! $isClosed) {
            validator($payload, [
                'opens_at' => ['required', 'date_format:H:i'],
                'closes_at' => ['required', 'date_format:H:i'],
            ])->validate();
        }

        $payload['is_closed'] = $isClosed;
        if ($isClosed) {
            $payload['opens_at'] = null;
            $payload['closes_at'] = null;
        }

        return $payload;
    }
}
