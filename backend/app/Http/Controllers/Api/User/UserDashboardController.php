<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Http\Resources\TicketResource;
use App\Models\Event;
use App\Models\Ticket;
use App\Services\Dashboard\UserDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserDashboardController extends Controller
{
    public function __construct(private readonly UserDashboardService $dashboard) {}

    public function summary(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->dashboard->summary($request->user()),
        ]);
    }

    public function upcomingEvents(Request $request): JsonResponse
    {
        $tickets = $request->user()
            ->tickets()
            ->with(['event.images', 'ticketType', 'order'])
            ->where('status', '!=', Ticket::STATUS_CANCELLED)
            ->where('status', '!=', Ticket::STATUS_REFUNDED)
            ->whereHas('event', fn ($query) => $query->where('starts_at', '>=', now()))
            ->orderBy(
                Event::query()->select('starts_at')->whereColumn('events.id', 'tickets.event_id'),
                'asc'
            )
            ->get();

        $events = $tickets->pluck('event')->unique('id')->values();

        return response()->json([
            'data' => EventResource::collection($events),
            'included' => [
                'tickets' => TicketResource::collection($tickets),
            ],
        ]);
    }
}
