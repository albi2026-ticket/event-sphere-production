<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Dashboard\DashboardListRequest;
use App\Http\Resources\TicketResource;
use App\Models\Event;
use App\Models\Ticket;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserTicketController extends Controller
{
    public function index(DashboardListRequest $request): AnonymousResourceCollection
    {
        [$sortColumn, $sortDirection] = $request->sort('created_at', 'desc');
        $sortColumn = in_array($sortColumn, ['created_at', 'starts_at', 'status'], true) ? $sortColumn : 'created_at';

        return TicketResource::collection(
            $request->user()
                ->tickets()
                ->with(['user', 'event', 'ticketType', 'order.user', 'checkedInBy'])
                ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
                ->when($request->boolean('upcoming'), fn ($query) => $query->whereHas('event', fn ($eventQuery) => $eventQuery->where('starts_at', '>=', now())))
                ->when($request->filled('search'), fn ($query) => $query->where(function ($searchQuery) use ($request): void {
                    $search = '%'.$request->input('search').'%';
                    $searchQuery->where('ticket_code', 'like', $search)
                        ->orWhereHas('event', fn ($eventQuery) => $eventQuery->where('title', 'like', $search));
                }))
                ->when($sortColumn === 'starts_at', fn ($query) => $query->orderBy(
                    Event::query()->select('starts_at')->whereColumn('events.id', 'tickets.event_id'),
                    $sortDirection
                ), fn ($query) => $query->orderBy($sortColumn, $sortDirection))
                ->paginate($request->perPage())
        );
    }

    public function active(DashboardListRequest $request): AnonymousResourceCollection
    {
        $request->merge(['status' => Ticket::STATUS_ACTIVE]);

        return $this->index($request);
    }

    public function history(DashboardListRequest $request): AnonymousResourceCollection
    {
        return TicketResource::collection(
            $request->user()
                ->tickets()
                ->with(['user', 'event', 'ticketType', 'order.user', 'checkedInBy'])
                ->whereIn('status', [Ticket::STATUS_USED, Ticket::STATUS_CANCELLED, Ticket::STATUS_REFUNDED])
                ->latest()
                ->paginate($request->perPage())
        );
    }
}
