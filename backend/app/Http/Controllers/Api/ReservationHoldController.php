<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReservationHoldResource;
use App\Models\ReservationHold;
use App\Models\Venue;
use App\Services\Reservations\ReservationHoldService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReservationHoldController extends Controller
{
    public function __construct(private readonly ReservationHoldService $holds) {}

    public function store(Request $request): ReservationHoldResource
    {
        if (! $request->user()?->hasVerifiedEmail()) {
            throw new AuthorizationException('Please verify your email address before creating a reservation.');
        }

        $payload = $request->validate([
            'venue_id' => ['required', 'integer', Rule::exists(Venue::class, 'id')],
            'party_size' => ['required', 'integer', 'min:1', 'max:1000'],
            'reservation_date' => ['required', 'date_format:Y-m-d'],
            'reservation_time' => ['required', 'date_format:H:i'],
        ]);

        $hold = $this->holds->create($request->user(), $payload);

        return new ReservationHoldResource($hold);
    }

    public function show(Request $request, ReservationHold $reservationHold): ReservationHoldResource
    {
        abort_unless($reservationHold->user_id === $request->user()->id || $request->user()->isAdmin(), 403);

        return new ReservationHoldResource($reservationHold);
    }

    public function cancel(Request $request, ReservationHold $reservationHold): JsonResponse
    {
        abort_unless($reservationHold->user_id === $request->user()->id || $request->user()->isAdmin(), 403);

        $request->validate([
            'status' => ['nullable', Rule::in([ReservationHold::STATUS_CANCELLED, ReservationHold::STATUS_EXPIRED])],
        ]);

        $this->holds->cancel(
            $reservationHold,
            $request->input('status', ReservationHold::STATUS_CANCELLED),
        );

        return response()->json([
            'data' => new ReservationHoldResource($reservationHold->fresh()),
        ]);
    }
}
