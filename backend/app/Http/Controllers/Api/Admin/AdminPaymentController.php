<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Payments\RefundPaymentRequest;
use App\Models\Order;
use App\Models\Ticket;
use App\Services\Payments\StripePaymentService;
use App\Services\Tickets\TicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AdminPaymentController extends Controller
{
    public function __construct(
        private readonly StripePaymentService $stripe,
        private readonly TicketService $tickets,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $orders = Order::query()
            ->with(['user:id,name,email', 'items.event:id,title,organizer_id', 'items.ticketType:id,name', 'tickets.user:id,name,email,phone', 'tickets.event:id,title', 'tickets.ticketType:id,name'])
            ->when($request->filled('payment_status'), fn ($query) => $query->where('payment_status', $request->input('payment_status')))
            ->when($request->filled('payment_provider'), fn ($query) => $query->where('payment_provider', $request->input('payment_provider')))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($orders);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load(['user:id,name,email', 'items.event:id,title,organizer_id', 'items.ticketType:id,name', 'tickets.user:id,name,email,phone', 'tickets.event:id,title', 'tickets.ticketType:id,name']);

        return response()->json(['data' => $order]);
    }

    public function refund(RefundPaymentRequest $request, Order $order): JsonResponse
    {
        if ($order->payment_status !== Order::PAYMENT_STATUS_PAID) {
            throw ValidationException::withMessages([
                'order' => 'Only paid orders can be refunded.',
            ]);
        }

        if (! $order->stripe_payment_intent_id) {
            $order->forceFill([
                'status' => Order::STATUS_REFUNDED,
                'payment_status' => Order::PAYMENT_STATUS_REFUNDED,
                'payment_reference' => $order->payment_reference ?: 'mock-refund-'.$order->order_number,
                'refunded_at' => now(),
            ])->save();

            $this->tickets->markOrderTickets($order, Ticket::STATUS_REFUNDED);

            return response()->json([
                'data' => [
                    'refund_id' => 'mock-refund-'.$order->order_number,
                    'status' => 'succeeded',
                    'order' => $order->fresh(),
                ],
            ]);
        }

        $refund = $this->stripe->refundOrder(
            $order,
            $request->filled('amount') ? (float) $request->input('amount') : null,
            $request->input('reason')
        );

        return response()->json([
            'data' => [
                'refund_id' => $refund->id,
                'status' => $refund->status,
                'order' => $order->fresh(),
            ],
        ]);
    }
}
