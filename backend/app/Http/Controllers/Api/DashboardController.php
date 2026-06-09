<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CheckoutReservation;
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
        $reservationStats = CheckoutReservation::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'data' => [
                'scope' => 'platform',
                'message' => 'Admin dashboard API access granted.',
                'reservations' => [
                    'active' => (int) ($reservationStats[CheckoutReservation::STATUS_ACTIVE] ?? 0),
                    'expired' => (int) ($reservationStats[CheckoutReservation::STATUS_EXPIRED] ?? 0),
                    'completed' => (int) ($reservationStats[CheckoutReservation::STATUS_COMPLETED] ?? 0),
                ],
            ],
        ]);
    }
}
