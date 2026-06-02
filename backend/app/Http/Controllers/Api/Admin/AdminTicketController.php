<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Tickets\CheckInTicketRequest;
use App\Http\Requests\Api\Tickets\UpdateTicketStatusRequest;
use App\Http\Requests\Api\Tickets\ValidateTicketRequest;
use App\Http\Resources\TicketResource;
use App\Models\Ticket;
use App\Services\Tickets\TicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminTicketController extends Controller
{
    public function __construct(private readonly TicketService $tickets) {}

    public function index(Request $request): JsonResponse
    {
        $tickets = Ticket::query()
            ->with(['user', 'event', 'ticketType', 'order.user', 'checkedInBy'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
            ->when($request->filled('event_id'), fn ($query) => $query->where('event_id', $request->integer('event_id')))
            ->when($request->filled('user_id'), fn ($query) => $query->where('user_id', $request->integer('user_id')))
            ->latest()
            ->paginate($request->integer('per_page', 25));

        return response()->json($tickets->through(fn (Ticket $ticket) => (new TicketResource($ticket))->resolve($request)));
    }

    public function show(Ticket $ticket): TicketResource
    {
        return new TicketResource($ticket->load(['user', 'event', 'ticketType', 'order.user', 'checkedInBy']));
    }

    public function validateTicket(ValidateTicketRequest $request): JsonResponse
    {
        $ticket = $this->tickets->findByScannerPayload($request->input('token'), $request->input('ticket_code'));
        $this->ensureEventMatchesRequest($request, $ticket);

        return response()->json([
            'data' => [
                'validation' => $this->tickets->validationResult($ticket),
                'ticket' => new TicketResource($ticket),
            ],
        ]);
    }

    public function checkIn(CheckInTicketRequest $request): JsonResponse
    {
        $ticket = $this->tickets->findByScannerPayload($request->input('token'), $request->input('ticket_code'));
        $this->ensureEventMatchesRequest($request, $ticket);

        $ticket = $this->tickets->checkIn(
            $ticket,
            $request->user(),
            $request->input('method', 'qr'),
            $request->input('notes')
        );

        return response()->json([
            'data' => [
                'validation' => $this->tickets->validationResult($ticket),
                'ticket' => new TicketResource($ticket),
            ],
        ]);
    }

    public function updateStatus(UpdateTicketStatusRequest $request, Ticket $ticket): TicketResource
    {
        $ticket->forceFill([
            'status' => $request->input('status'),
            'checked_in_notes' => $request->input('notes', $ticket->checked_in_notes),
        ])->save();

        return new TicketResource($ticket->fresh(['user', 'event', 'ticketType', 'order.user', 'checkedInBy']));
    }

    protected function ensureEventMatchesRequest(Request $request, Ticket $ticket): void
    {
        abort_if($request->filled('event_id') && (int) $request->input('event_id') !== $ticket->event_id, 422, 'Ticket does not belong to the selected event.');
    }
}
