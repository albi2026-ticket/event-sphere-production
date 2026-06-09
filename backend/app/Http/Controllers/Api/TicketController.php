<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TicketResource;
use App\Models\Order;
use App\Models\Ticket;
use App\Services\Tickets\TicketPdfService;
use App\Services\Tickets\TicketService;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TicketController extends Controller
{
    public function __construct(
        private readonly TicketService $tickets,
        private readonly TicketPdfService $ticketPdfs,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return TicketResource::collection(
            Ticket::query()
                ->with(['user', 'event', 'ticketType', 'order.user'])
                ->where('user_id', $request->user()->id)
                ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
                ->orderByDesc(Order::query()->select('created_at')->whereColumn('orders.id', 'tickets.order_id'))
                ->orderByDesc('tickets.id')
                ->paginate($request->integer('per_page', 15))
        );
    }

    public function show(Request $request, Ticket $ticket): TicketResource
    {
        $ticket->load(['user', 'event', 'ticketType', 'order.user', 'checkedInBy']);

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
        $ticket->load(['user', 'event', 'ticketType', 'order.user', 'orderItem']);

        abort_unless($request->user()->can('download', $ticket), 403);

        $this->tickets->markDownloaded($ticket);
        $pdf = $this->ticketPdfs->download($ticket);

        return response($pdf['content'], 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$pdf['filename'].'"',
        ]);
    }

    public function emailQrCode(Ticket $ticket): Response
    {
        $ticket->load(['event', 'order']);

        $this->authorizeSignedEmailTicketAccess($ticket);

        return response($this->tickets->qrSvg($ticket), 200, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    public function emailDownload(Ticket $ticket): Response
    {
        $ticket->load(['user', 'event', 'ticketType', 'order.user', 'orderItem']);

        $this->authorizeSignedEmailTicketAccess($ticket);

        $this->tickets->markDownloaded($ticket);
        $pdf = $this->ticketPdfs->download($ticket);

        return response($pdf['content'], 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$pdf['filename'].'"',
        ]);
    }

    public function orderTickets(Request $request, int $order): AnonymousResourceCollection
    {
        return TicketResource::collection(
            Ticket::query()
                ->with(['user', 'event', 'ticketType', 'order.user'])
                ->where('order_id', $order)
                ->where('user_id', $request->user()->id)
                ->orderByDesc('tickets.id')
                ->get()
        );
    }

    private function authorizeSignedEmailTicketAccess(Ticket $ticket): void
    {
        abort_unless($ticket->order?->payment_status === Order::PAYMENT_STATUS_PAID, SymfonyResponse::HTTP_FORBIDDEN);
        abort_if(in_array($ticket->status, [Ticket::STATUS_CANCELLED, Ticket::STATUS_REFUNDED], true), SymfonyResponse::HTTP_FORBIDDEN);
    }
}
