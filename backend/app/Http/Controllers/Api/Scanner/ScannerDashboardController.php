<?php

namespace App\Http\Controllers\Api\Scanner;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Http\Resources\TicketValidationLogResource;
use App\Models\Event;
use App\Models\Ticket;
use App\Models\TicketValidationLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScannerDashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $events = $this->assignedEventsQuery($request)
            ->with(['images', 'ticketTypes'])
            ->orderByRaw('starts_at IS NULL ASC')
            ->orderBy('starts_at')
            ->get();

        $logs = TicketValidationLog::query()
            ->with(['event', 'ticket'])
            ->where('scanned_by', $request->user()->id)
            ->latest('scanned_at')
            ->limit(8)
            ->get();

        return response()->json([
            'data' => [
                'assigned_event' => $events->count() === 1 ? new EventResource($events->first()) : null,
                'assigned_events' => EventResource::collection($events),
                'total_scanned_today' => TicketValidationLog::query()
                    ->where('scanned_by', $request->user()->id)
                    ->whereDate('scanned_at', today())
                    ->count(),
                'recent_scans' => TicketValidationLogResource::collection($logs),
            ],
        ]);
    }

    public function events(Request $request): JsonResponse
    {
        $events = $this->assignedEventsQuery($request)
            ->with(['images', 'ticketTypes'])
            ->orderByRaw('starts_at IS NULL ASC')
            ->orderBy('starts_at')
            ->get();

        return response()->json([
            'data' => EventResource::collection($events),
        ]);
    }

    public function checkInStats(Request $request, Event $event): JsonResponse
    {
        abort_unless($request->user()->canScanEvent($event), 403);

        $sold = Ticket::query()->where('event_id', $event->id)->count();
        $checkedIn = Ticket::query()
            ->where('event_id', $event->id)
            ->where('status', Ticket::STATUS_CHECKED_IN)
            ->count();

        return response()->json([
            'data' => [
                'event_id' => $event->id,
                'tickets_sold' => $sold,
                'checked_in' => $checkedIn,
                'remaining' => max(0, $sold - $checkedIn),
            ],
        ]);
    }

    private function assignedEventsQuery(Request $request): Builder
    {
        return Event::query()
            ->whereHas('scanners', fn ($query) => $query->whereKey($request->user()->id));
    }
}
