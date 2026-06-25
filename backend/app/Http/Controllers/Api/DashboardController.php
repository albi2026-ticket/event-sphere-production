<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CheckoutReservation;
use App\Models\Reservation;
use App\Models\Venue;
use App\Services\Dashboard\OrganizerDashboardService;
use App\Services\Dashboard\UserDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly UserDashboardService $userDashboard,
        private readonly OrganizerDashboardService $organizerDashboard,
    ) {}

    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->userDashboard->summary($request->user()),
        ]);
    }

    public function organizer(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                ...$this->organizerDashboard->summary($user),
            ],
        ]);
    }

    public function admin(): JsonResponse
    {
        $checkoutReservationStats = CheckoutReservation::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $reservationStats = Reservation::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'data' => [
                'scope' => 'platform',
                'message' => 'Admin dashboard API access granted.',
                'checkout_reservations' => [
                    'active' => (int) ($checkoutReservationStats[CheckoutReservation::STATUS_ACTIVE] ?? 0),
                    'expired' => (int) ($checkoutReservationStats[CheckoutReservation::STATUS_EXPIRED] ?? 0),
                    'completed' => (int) ($checkoutReservationStats[CheckoutReservation::STATUS_COMPLETED] ?? 0),
                ],
                'reservations' => [
                    'active' => (int) ($checkoutReservationStats[CheckoutReservation::STATUS_ACTIVE] ?? 0),
                    'expired' => (int) ($checkoutReservationStats[CheckoutReservation::STATUS_EXPIRED] ?? 0),
                    'completed' => (int) ($checkoutReservationStats[CheckoutReservation::STATUS_COMPLETED] ?? 0),
                    'total_venues' => Venue::query()->count(),
                    'active_venues' => Venue::query()->where('status', Venue::STATUS_ACTIVE)->count(),
                    'total_reservations' => Reservation::query()->count(),
                    'pending_reservations' => (int) ($reservationStats[Reservation::STATUS_PENDING] ?? 0),
                    'confirmed_reservations' => (int) ($reservationStats[Reservation::STATUS_CONFIRMED] ?? 0),
                    'cancelled_reservations' => (int) ($reservationStats[Reservation::STATUS_CANCELLED] ?? 0),
                ],
            ],
        ]);
    }
}
