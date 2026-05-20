<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Payments\RefundPaymentRequest;
use App\Models\Order;
use App\Services\Payments\StripePaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPaymentController extends Controller
{
    public function __construct(private readonly StripePaymentService $stripe) {}

    public function index(Request $request): JsonResponse
    {
        $orders = Order::query()
            ->with(['user:id,name,email', 'items.event:id,title,organizer_id', 'items.ticketType:id,name'])
            ->when($request->filled('payment_status'), fn ($query) => $query->where('payment_status', $request->input('payment_status')))
            ->when($request->filled('payment_provider'), fn ($query) => $query->where('payment_provider', $request->input('payment_provider')))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($orders);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load(['user:id,name,email', 'items.event:id,title,organizer_id', 'items.ticketType:id,name']);

        return response()->json(['data' => $order]);
    }

    public function refund(RefundPaymentRequest $request, Order $order): JsonResponse
    {
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
