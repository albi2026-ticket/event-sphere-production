<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Organizer\OrganizerDashboardRequest;
use App\Http\Resources\OrderResource;
use App\Http\Resources\Organizer\EventPerformanceResource;
use App\Http\Resources\TicketResource;
use App\Models\User;
use App\Services\Dashboard\OrganizerDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdminOrganizerDashboardController extends Controller
{
    public function __construct(private readonly OrganizerDashboardService $dashboard) {}

    public function summary(OrganizerDashboardRequest $request, User $organizer): JsonResponse
    {
        $this->ensureOrganizer($organizer);

        return response()->json([
            'data' => $this->dashboard->summary($organizer, $request->validated()),
        ]);
    }

    public function analytics(OrganizerDashboardRequest $request, User $organizer): JsonResponse
    {
        $this->ensureOrganizer($organizer);

        return response()->json([
            'data' => $this->dashboard->analytics($organizer, $request->validated()),
        ]);
    }

    public function revenue(OrganizerDashboardRequest $request, User $organizer): JsonResponse
    {
        $this->ensureOrganizer($organizer);
        $filters = $request->validated();

        return response()->json([
            'data' => [
                'total_revenue' => $this->dashboard->summary($organizer, $filters)['cards']['total_revenue'],
                'by_event' => $this->dashboard->revenueByEvent($organizer, $filters),
                'trends' => $this->dashboard->salesTrends($organizer, $filters),
            ],
        ]);
    }

    public function eventPerformance(OrganizerDashboardRequest $request, User $organizer): AnonymousResourceCollection
    {
        $this->ensureOrganizer($organizer);

        return EventPerformanceResource::collection(
            $this->dashboard->eventPerformance($organizer, $request->validated())
        );
    }

    public function inventory(OrganizerDashboardRequest $request, User $organizer): JsonResponse
    {
        $this->ensureOrganizer($organizer);

        return response()->json([
            'data' => $this->dashboard->inventorySummary($organizer, $request->validated()),
        ]);
    }

    public function orders(OrganizerDashboardRequest $request, User $organizer): AnonymousResourceCollection
    {
        $this->ensureOrganizer($organizer);

        return OrderResource::collection(
            $this->dashboard
                ->ordersListQuery($organizer, $request->validated())
                ->latest('orders.created_at')
                ->paginate($request->perPage())
        );
    }

    public function attendees(OrganizerDashboardRequest $request, User $organizer): AnonymousResourceCollection
    {
        $this->ensureOrganizer($organizer);

        return TicketResource::collection(
            $this->dashboard
                ->attendeesListQuery($organizer, $request->validated())
                ->latest('tickets.created_at')
                ->paginate($request->perPage(25))
        );
    }

    protected function ensureOrganizer(User $organizer): void
    {
        abort_unless(
            $organizer->role === User::ROLE_ORGANIZER || $organizer->organizedEvents()->exists(),
            404,
            'Organizer was not found.'
        );
    }
}
