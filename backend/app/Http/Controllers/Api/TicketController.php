<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TicketResource;
use App\Models\Order;
use App\Models\Ticket;
use App\Services\Tickets\TicketPdfService;
use App\Services\Tickets\TicketService;
use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class TicketController extends Controller
{
    public function __construct(
        private readonly TicketService $tickets,
        private readonly TicketPdfService $ticketPdfs,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        Profiler::begin('TicketController@index');

        $paginated = Profiler::section('Ticket pagination query with eager loads', fn () => Ticket::query()
                ->with(['user', 'event', 'ticketType', 'order.user'])
                ->where('user_id', $request->user()->id)
                ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
                ->orderByDesc(Order::query()->select('created_at')->whereColumn('orders.id', 'tickets.order_id'))
                ->orderByDesc('tickets.id')
                ->paginate($request->integer('per_page', 15)));

        return Profiler::section('TicketResource collection create', fn (): AnonymousResourceCollection => TicketResource::collection($paginated));
    }

    public function show(Request $request, Ticket $ticket): TicketResource
    {
        Profiler::begin('TicketController@show');

        Profiler::section('Ticket eager load show relations', fn () => $ticket->load(['user', 'event', 'ticketType', 'order.user', 'checkedInBy']));

        Profiler::section('Ticket policy can view', fn () => abort_unless($request->user()->can('view', $ticket), 403));

        return Profiler::section('TicketResource create', fn (): TicketResource => new TicketResource($ticket));
    }

    public function qrCode(Request $request, Ticket $ticket): Response
    {
        Profiler::begin('TicketController@qrCode');

        Profiler::section('Ticket eager load event for QR', fn () => $ticket->load(['event']));

        Profiler::section('Ticket policy can view/manage QR', fn () => abort_unless($request->user()->can('view', $ticket) || $request->user()->can('manage', $ticket), 403));

        $svg = Profiler::section('TicketService::qrSvg', fn (): string => $this->tickets->qrSvg($ticket));

        return Profiler::section('Return SVG response', fn (): Response => response($svg, 200, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'private, max-age=300',
        ]));
    }

    public function download(Request $request, Ticket $ticket): Response
    {
        Profiler::begin('TicketController@download');

        Profiler::section('Ticket eager load download relations', fn () => $ticket->load(['user', 'event', 'ticketType', 'order.user', 'orderItem']));

        Profiler::section('Ticket policy can download', fn () => abort_unless($request->user()->can('download', $ticket), 403));

        Profiler::section('TicketService::markDownloaded', function () use ($ticket): void {
            $this->tickets->markDownloaded($ticket);
        });
        $pdf = Profiler::section('TicketPdfService::download', fn (): array => $this->ticketPdfs->download($ticket));

        return Profiler::section('Return PDF response', fn (): Response => response($pdf['content'], 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$pdf['filename'].'"',
        ]));
    }

    public function emailQrCode(Ticket $ticket): Response
    {
        Profiler::begin('TicketController@emailQrCode');

        Profiler::section('Ticket eager load event/order for email QR', fn () => $ticket->load(['event', 'order']));

        Profiler::section('authorizeSignedEmailTicketAccess', function () use ($ticket): void {
            $this->authorizeSignedEmailTicketAccess($ticket);
        });

        $svg = Profiler::section('TicketService::qrSvg', fn (): string => $this->tickets->qrSvg($ticket));

        return Profiler::section('Return signed email SVG response', fn (): Response => response($svg, 200, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'private, max-age=300',
        ]));
    }

    public function emailDownload(Ticket $ticket): Response
    {
        Profiler::begin('TicketController@emailDownload');

        Profiler::section('Ticket eager load signed email download relations', fn () => $ticket->load(['user', 'event', 'ticketType', 'order.user', 'orderItem']));

        Profiler::section('authorizeSignedEmailTicketAccess', function () use ($ticket): void {
            $this->authorizeSignedEmailTicketAccess($ticket);
        });

        Profiler::section('TicketService::markDownloaded', function () use ($ticket): void {
            $this->tickets->markDownloaded($ticket);
        });
        $pdf = Profiler::section('TicketPdfService::download', fn (): array => $this->ticketPdfs->download($ticket));

        return Profiler::section('Return signed email PDF response', fn (): Response => response($pdf['content'], 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$pdf['filename'].'"',
        ]));
    }

    public function orderTickets(Request $request, int $order): AnonymousResourceCollection
    {
        Profiler::begin('TicketController@orderTickets');

        $tickets = Profiler::section('Order tickets query with eager loads', fn () => Ticket::query()
                ->with(['user', 'event', 'ticketType', 'order.user'])
                ->where('order_id', $order)
                ->where('user_id', $request->user()->id)
                ->orderByDesc('tickets.id')
                ->get());

        return Profiler::section('TicketResource order tickets collection create', fn (): AnonymousResourceCollection => TicketResource::collection($tickets));
    }

    private function authorizeSignedEmailTicketAccess(Ticket $ticket): void
    {
        Profiler::section('Assert paid order for signed ticket access', fn () => abort_unless($ticket->order?->payment_status === Order::PAYMENT_STATUS_PAID, SymfonyResponse::HTTP_FORBIDDEN));
        Profiler::section('Assert ticket not cancelled/refunded', fn () => abort_if(in_array($ticket->status, [Ticket::STATUS_CANCELLED, Ticket::STATUS_REFUNDED], true), SymfonyResponse::HTTP_FORBIDDEN));
    }
}
