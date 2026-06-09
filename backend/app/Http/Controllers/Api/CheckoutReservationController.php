<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CheckoutReservationResource;
use App\Models\CheckoutReservation;
use App\Services\Checkout\CheckoutReservationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CheckoutReservationController extends Controller
{
    public function __construct(private readonly CheckoutReservationService $reservations) {}

    public function store(Request $request): CheckoutReservationResource
    {
        $validated = $request->validate([
            'ticket_type_id' => ['required', 'integer', 'exists:ticket_types,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $reservation = $this->reservations->reserve(
            $request->user(),
            (int) $validated['ticket_type_id'],
            (int) $validated['quantity'],
        );

        return new CheckoutReservationResource($reservation);
    }

    public function show(Request $request, CheckoutReservation $checkoutReservation): CheckoutReservationResource
    {
        abort_unless($checkoutReservation->user_id === $request->user()->id || $request->user()->isAdmin(), 403);

        return new CheckoutReservationResource($checkoutReservation);
    }

    public function cancel(Request $request, CheckoutReservation $checkoutReservation): JsonResponse
    {
        abort_unless($checkoutReservation->user_id === $request->user()->id || $request->user()->isAdmin(), 403);

        $request->validate([
            'status' => ['nullable', Rule::in([CheckoutReservation::STATUS_CANCELLED, CheckoutReservation::STATUS_EXPIRED])],
        ]);

        if ($checkoutReservation->status === CheckoutReservation::STATUS_ACTIVE && $checkoutReservation->order_id === null) {
            $checkoutReservation->forceFill([
                'status' => $request->input('status', CheckoutReservation::STATUS_CANCELLED),
            ])->save();
        }

        return response()->json([
            'data' => new CheckoutReservationResource($checkoutReservation->fresh()),
        ]);
    }
}
