<?php

namespace App\Http\Controllers\Api\Organizer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Organizer\OrganizerDashboardRequest;
use App\Http\Resources\OrderResource;
use App\Http\Resources\Organizer\EventPerformanceResource;
use App\Http\Resources\TicketResource;
use App\Models\Event;
use App\Services\Dashboard\OrganizerDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrganizerDashboardController extends Controller
{
    public function __construct(private readonly OrganizerDashboardService $dashboard) {}

    public function summary(OrganizerDashboardRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->dashboard->summary($request->user(), $request->validated()),
        ]);
    }

    public function analytics(OrganizerDashboardRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->dashboard->analytics($request->user(), $request->validated()),
        ]);
    }

    public function revenue(OrganizerDashboardRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $byEvent = $this->dashboard->revenueByEvent($request->user(), $filters);

        return response()->json([
            'data' => [
                'total_revenue' => (string) $byEvent->sum(fn ($event) => (float) $event->revenue),
                'by_event' => $byEvent,
                'trends' => $this->dashboard->salesTrends($request->user(), $filters),
            ],
        ]);
    }

    public function salesTrends(OrganizerDashboardRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->dashboard->salesTrends($request->user(), $request->validated()),
            'meta' => [
                'group_by' => $request->input('group_by', 'day'),
            ],
        ]);
    }

    public function eventPerformance(OrganizerDashboardRequest $request): AnonymousResourceCollection
    {
        return EventPerformanceResource::collection(
            $this->dashboard->eventPerformance($request->user(), $request->validated())
        );
    }

    public function eventAnalytics(OrganizerDashboardRequest $request, Event $event): JsonResponse
    {
        $filters = array_merge($request->validated(), ['event_id' => $event->id]);
        $performance = $this->dashboard->eventPerformance($request->user(), $filters)->first();

        return response()->json([
            'data' => [
                'summary' => $this->dashboard->summary($request->user(), $filters)['cards'],
                'performance' => $performance ? new EventPerformanceResource($performance) : null,
                'revenue' => $this->dashboard->revenueByEvent($request->user(), $filters)->first(),
                'sales_trends' => $this->dashboard->salesTrends($request->user(), $filters),
                'inventory' => $this->dashboard->inventorySummary($request->user(), $filters),
                'conversion_metrics' => $this->dashboard->conversionMetrics($request->user(), $filters)->first(),
            ],
        ]);
    }

    public function inventory(OrganizerDashboardRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->dashboard->inventorySummary($request->user(), $request->validated()),
        ]);
    }

    public function recentOrders(OrganizerDashboardRequest $request): AnonymousResourceCollection
    {
        [$sortColumn, $sortDirection] = $request->sort('created_at', 'desc');
        $sortColumn = in_array($sortColumn, ['created_at', 'total', 'status'], true) ? $sortColumn : 'created_at';

        return OrderResource::collection(
            $this->dashboard
                ->ordersListQuery($request->user(), $request->validated())
                ->orderBy("orders.{$sortColumn}", $sortDirection)
                ->paginate($request->perPage())
        );
    }

    public function attendees(OrganizerDashboardRequest $request): AnonymousResourceCollection
    {
        [$sortColumn, $sortDirection] = $request->sort('created_at', 'desc');
        $sortColumn = in_array($sortColumn, ['created_at', 'status'], true) ? $sortColumn : 'created_at';

        return TicketResource::collection(
            $this->dashboard
                ->attendeesListQuery($request->user(), $request->validated())
                ->orderBy("tickets.{$sortColumn}", $sortDirection)
                ->paginate($request->perPage(25))
        );
    }
}
