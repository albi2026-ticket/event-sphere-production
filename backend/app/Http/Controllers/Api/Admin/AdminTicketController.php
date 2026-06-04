<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Tickets\CheckInTicketRequest;
use App\Http\Requests\Api\Tickets\UpdateTicketStatusRequest;
use App\Http\Requests\Api\Tickets\ValidateTicketRequest;
use App\Http\Resources\TicketResource;
use App\Http\Resources\TicketValidationLogResource;
use App\Models\Ticket;
use App\Models\TicketValidationLog;
use App\Services\Tickets\TicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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
        $search = trim((string) $request->input('q', ''));

        $tickets = Ticket::query()
            ->with(['user', 'event', 'ticketType', 'order.user', 'checkedInBy'])
            ->when($request->filled('event_id'), fn ($query) => $query->where('event_id', $request->integer('event_id')))
            ->when($search !== '', function ($query) use ($search): void {
                $needle = '%'.$search.'%';
                $query->where(function ($query) use ($needle): void {
                    $query
                        ->where('ticket_code', 'like', $needle)
                        ->orWhere('ticket_uuid', 'like', $needle)
                        ->orWhere('attendee_name', 'like', $needle)
                        ->orWhere('attendee_email', 'like', $needle)
                        ->orWhereHas('order', fn ($orderQuery) => $orderQuery->where('order_number', 'like', $needle))
                        ->orWhereHas('event', fn ($eventQuery) => $eventQuery->where('title', 'like', $needle));
                });
            })
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'data' => $tickets->map(fn (Ticket $ticket) => (new TicketResource($ticket))->resolve($request))->values(),
        ]);
    }

    public function checkInStats(Request $request): JsonResponse
    {
        $eventId = $request->integer('event_id') ?: null;
        $tickets = Ticket::query()
            ->when($eventId, fn ($query) => $query->where('event_id', $eventId));

        $sold = (clone $tickets)->count();
        $checkedIn = (clone $tickets)
            ->where('status', Ticket::STATUS_CHECKED_IN)
            ->count();

        return response()->json([
            'data' => [
                'event_id' => $eventId,
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
            ->when($request->filled('event_id'), fn ($query) => $query->where('event_id', $request->integer('event_id')))
            ->when($request->filled('result'), fn ($query) => $query->where('result', $request->input('result')))
            ->latest('scanned_at')
            ->paginate($request->integer('per_page', 20));

        return response()->json($logs->through(fn (TicketValidationLog $log) => (new TicketValidationLogResource($log))->resolve($request)));
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
