<?php

namespace App\Http\Controllers\Api\Organizer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Tickets\CheckInTicketRequest;
use App\Http\Requests\Api\Tickets\ValidateTicketRequest;
use App\Http\Resources\TicketResource;
use App\Models\Event;
use App\Models\Ticket;
use App\Services\Tickets\TicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizerTicketController extends Controller
{
    public function __construct(private readonly TicketService $tickets) {}

    public function attendees(Request $request, Event $event): JsonResponse
    {
        abort_unless($event->organizer_id === $request->user()->id, 403);

        $tickets = Ticket::query()
            ->with(['user', 'event', 'ticketType', 'order.user', 'checkedInBy'])
            ->where('event_id', $event->id)
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
            ->latest()
            ->paginate($request->integer('per_page', 25));

        return response()->json($tickets->through(fn (Ticket $ticket) => (new TicketResource($ticket))->resolve($request)));
    }

    public function validateTicket(ValidateTicketRequest $request): JsonResponse
    {
        $ticket = $this->tickets->findByScannerPayload($request->input('token'), $request->input('ticket_code'));
        abort_unless($request->user()->can('manage', $ticket), 403);
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
        abort_unless($request->user()->can('checkIn', $ticket), 403);
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

    protected function ensureEventMatchesRequest(Request $request, Ticket $ticket): void
    {
        abort_if($request->filled('event_id') && (int) $request->input('event_id') !== $ticket->event_id, 422, 'Ticket does not belong to the selected event.');
    }
}
