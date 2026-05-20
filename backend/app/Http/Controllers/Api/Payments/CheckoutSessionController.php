<?php

namespace App\Http\Controllers\Api\Payments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Payments\CreateCheckoutSessionRequest;
use App\Models\Order;
use App\Services\Payments\StripePaymentService;
use Illuminate\Http\JsonResponse;

class CheckoutSessionController extends Controller
{
    public function __construct(private readonly StripePaymentService $stripe) {}

    public function show(CreateCheckoutSessionRequest $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()?->id || $request->user()?->isAdmin(), 403);

        return response()->json([
            'data' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'payment_provider' => $order->payment_provider,
                'paid_at' => $order->paid_at,
                'cancelled_at' => $order->cancelled_at,
                'refunded_at' => $order->refunded_at,
                'total' => $order->total,
                'currency' => $order->currency,
            ],
        ]);
    }

    public function store(CreateCheckoutSessionRequest $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()?->id, 403, 'You can only pay for your own orders.');

        $session = $this->stripe->createCheckoutSession($order);

        return response()->json([
            'data' => [
                'checkout_session_id' => $session->id,
                'checkout_url' => $session->url,
                'payment_status' => $order->fresh()->payment_status,
                'order' => [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->fresh()->status,
                    'payment_status' => $order->fresh()->payment_status,
                    'total' => $order->total,
                    'currency' => $order->currency,
                ],
            ],
        ], 201);
    }
}
