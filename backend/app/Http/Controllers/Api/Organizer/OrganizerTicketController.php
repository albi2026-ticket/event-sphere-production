<?php

namespace App\Http\Controllers\Api\Organizer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Tickets\CheckInTicketRequest;
use App\Http\Requests\Api\Tickets\ValidateTicketRequest;
use App\Http\Resources\TicketResource;
use App\Http\Resources\TicketValidationLogResource;
use App\Models\Event;
use App\Models\Ticket;
use App\Models\TicketValidationLog;
use App\Services\Tickets\TicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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
        try {
            $ticket = $this->tickets->findByScannerPayload($request->input('token'), $request->input('ticket_code'), $request->input('ticket_uuid'));
        } catch (ValidationException) {
            $this->logInvalidScan($request, 'Ticket could not be found.');

            return response()->json([
                'data' => [
                    'validation' => $this->invalidValidation('Ticket could not be found.'),
                    'ticket' => null,
                ],
            ]);
        }

        abort_unless($request->user()->can('manage', $ticket), 403);
        $this->ensureEventMatchesRequest($request, $ticket);
        $validation = $this->tickets->validationResult($ticket);
        $this->tickets->logValidation($ticket, $request->user(), $this->logContext($request, [
            'result' => $validation['result'],
            'message' => $validation['reason'],
        ]));

        return response()->json([
            'data' => [
                'validation' => $validation,
                'ticket' => new TicketResource($ticket),
            ],
        ]);
    }

    public function checkIn(CheckInTicketRequest $request): JsonResponse
    {
        try {
            $ticket = $this->tickets->findByScannerPayload($request->input('token'), $request->input('ticket_code'), $request->input('ticket_uuid'));
        } catch (ValidationException) {
            $this->logInvalidScan($request, 'Ticket could not be found.');

            return response()->json([
                'message' => 'Invalid ticket.',
                'data' => [
                    'validation' => $this->invalidValidation('Ticket could not be found.'),
                    'ticket' => null,
                ],
            ], 422);
        }

        abort_unless($request->user()->can('checkIn', $ticket), 403);
        $this->ensureEventMatchesRequest($request, $ticket);

        try {
            $ticket = $this->tickets->checkIn(
                $ticket,
                $request->user(),
                $request->input('method', 'qr'),
                $request->input('notes')
            );
        } catch (ValidationException $exception) {
            $ticket->refresh();
            $validation = $this->tickets->validationResult($ticket);
            $this->tickets->logValidation($ticket, $request->user(), $this->logContext($request, [
                'result' => $validation['result'],
                'message' => $validation['reason'],
            ]));

            return response()->json([
                'message' => $exception->getMessage(),
                'data' => [
                    'validation' => $validation,
                    'ticket' => new TicketResource($ticket),
                ],
            ], 422);
        }

        return response()->json([
            'data' => [
                'validation' => $this->tickets->validationResult($ticket),
                'ticket' => new TicketResource($ticket),
            ],
        ]);
    }

    public function lookup(Request $request): JsonResponse
    {
        $eventId = $request->integer('event_id');
        $search = trim((string) $request->input('q', ''));

        $tickets = Ticket::query()
            ->with(['user', 'event', 'ticketType', 'order.user', 'checkedInBy'])
            ->whereHas('event', fn ($query) => $query->where('organizer_id', $request->user()->id))
            ->when($eventId, fn ($query) => $query->where('event_id', $eventId))
            ->when($search !== '', function ($query) use ($search): void {
                $needle = '%'.$search.'%';
                $query->where(function ($query) use ($needle): void {
                    $query
                        ->where('ticket_code', 'like', $needle)
                        ->orWhere('ticket_uuid', 'like', $needle)
                        ->orWhere('attendee_name', 'like', $needle)
                        ->orWhere('attendee_email', 'like', $needle)
                        ->orWhereHas('order', fn ($orderQuery) => $orderQuery->where('order_number', 'like', $needle));
                });
            })
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'data' => $tickets->map(fn (Ticket $ticket) => (new TicketResource($ticket))->resolve($request))->values(),
        ]);
    }

    public function checkInStats(Request $request, Event $event): JsonResponse
    {
        abort_unless($event->organizer_id === $request->user()->id, 403);

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

    public function validationLogs(Request $request): JsonResponse
    {
        $logs = TicketValidationLog::query()
            ->with(['event', 'ticket', 'scanner'])
            ->whereHas('event', fn ($query) => $query->where('organizer_id', $request->user()->id))
            ->when($request->filled('event_id'), fn ($query) => $query->where('event_id', $request->integer('event_id')))
            ->latest('scanned_at')
            ->paginate($request->integer('per_page', 20));

        return response()->json($logs->through(fn (TicketValidationLog $log) => (new TicketValidationLogResource($log))->resolve($request)));
    }

    protected function ensureEventMatchesRequest(Request $request, Ticket $ticket): void
    {
        abort_if($request->filled('event_id') && (int) $request->input('event_id') !== $ticket->event_id, 422, 'Ticket does not belong to the selected event.');
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    protected function logContext(Request $request, array $extra = []): array
    {
        return array_merge([
            'method' => $request->input('method', $request->input('token') ? 'qr' : 'manual'),
            'token' => $request->input('token'),
            'ticket_code' => $request->input('ticket_code'),
            'ticket_uuid' => $request->input('ticket_uuid'),
            'event_id' => $request->input('event_id'),
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1000),
        ], $extra);
    }

    protected function logInvalidScan(Request $request, string $message): void
    {
        $this->tickets->logValidation(null, $request->user(), $this->logContext($request, [
            'result' => TicketValidationLog::RESULT_INVALID,
            'message' => $message,
        ]));
    }

    /**
     * @return array<string, mixed>
     */
    protected function invalidValidation(string $message): array
    {
        return [
            'result' => TicketValidationLog::RESULT_INVALID,
            'title' => 'INVALID TICKET',
            'is_valid' => false,
            'can_check_in' => false,
            'reason' => $message,
            'ticket_status' => null,
            'checked_in_at' => null,
        ];
    }
}
