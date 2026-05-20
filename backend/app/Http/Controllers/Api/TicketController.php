<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TicketResource;
use App\Models\Ticket;
use App\Services\Tickets\TicketService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TicketController extends Controller
{
    public function __construct(private readonly TicketService $tickets) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return TicketResource::collection(
            Ticket::query()
                ->with(['event', 'ticketType', 'order'])
                ->where('user_id', $request->user()->id)
                ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
                ->latest()
                ->paginate($request->integer('per_page', 15))
        );
    }

    public function show(Request $request, Ticket $ticket): TicketResource
    {
        $ticket->load(['user', 'event', 'ticketType', 'order', 'checkedInBy']);

        abort_unless($request->user()->can('view', $ticket), 403);

        return new TicketResource($ticket);
    }

    public function qrCode(Request $request, Ticket $ticket): Response
    {
        $ticket->load(['event']);

        abort_unless($request->user()->can('view', $ticket) || $request->user()->can('manage', $ticket), 403);

        return response($this->tickets->qrSvg($ticket), 200, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    public function download(Request $request, Ticket $ticket): Response
    {
        $ticket->load(['user', 'event', 'ticketType', 'order']);

        abort_unless($request->user()->can('download', $ticket), 403);

        $this->tickets->markDownloaded($ticket);

        return response($this->tickets->downloadHtml($ticket), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="event-sphere-ticket-'.$ticket->ticket_code.'.html"',
        ]);
    }

    public function orderTickets(Request $request, int $order): AnonymousResourceCollection
    {
        return TicketResource::collection(
            Ticket::query()
                ->with(['event', 'ticketType', 'order'])
                ->where('order_id', $order)
                ->where('user_id', $request->user()->id)
                ->latest()
                ->get()
        );
    }
}
