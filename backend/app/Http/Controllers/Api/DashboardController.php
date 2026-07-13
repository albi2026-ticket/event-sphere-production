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
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    private const SUMMARY_TTL_SECONDS = 45;

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

    public function admin(Request $request): JsonResponse
    {
        return response()->json([
            'data' => Cache::remember(
                "dashboard:admin:summary:{$request->user()->id}",
                now()->addSeconds(self::SUMMARY_TTL_SECONDS),
                fn (): array => $this->adminSummary(),
            ),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function adminSummary(): array
    {
        $checkoutReservationStats = CheckoutReservation::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $reservationStats = Reservation::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $venueStats = Venue::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'scope' => 'platform',
            'message' => __('validation.custom.admin_dashboard_ready'),
            'checkout_reservations' => [
                'active' => (int) ($checkoutReservationStats[CheckoutReservation::STATUS_ACTIVE] ?? 0),
                'expired' => (int) ($checkoutReservationStats[CheckoutReservation::STATUS_EXPIRED] ?? 0),
                'completed' => (int) ($checkoutReservationStats[CheckoutReservation::STATUS_COMPLETED] ?? 0),
            ],
            'reservations' => [
                'active' => (int) ($checkoutReservationStats[CheckoutReservation::STATUS_ACTIVE] ?? 0),
                'expired' => (int) ($checkoutReservationStats[CheckoutReservation::STATUS_EXPIRED] ?? 0),
                'completed' => (int) ($checkoutReservationStats[CheckoutReservation::STATUS_COMPLETED] ?? 0),
                'total_venues' => (int) $venueStats->sum(),
                'active_venues' => (int) ($venueStats[Venue::STATUS_ACTIVE] ?? 0),
                'total_reservations' => (int) $reservationStats->sum(),
                'pending_reservations' => (int) ($reservationStats[Reservation::STATUS_PENDING] ?? 0),
                'confirmed_reservations' => (int) ($reservationStats[Reservation::STATUS_CONFIRMED] ?? 0),
                'cancelled_reservations' => (int) ($reservationStats[Reservation::STATUS_CANCELLED] ?? 0),
            ],
        ];
    }
}
