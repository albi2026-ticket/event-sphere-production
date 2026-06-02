<?php

namespace App\Http\Controllers\Api\Payments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Payments\CreateCheckoutSessionRequest;
use App\Models\Order;
use App\Services\Orders\OrderService;
use App\Services\Payments\StripePaymentService;
use App\Services\Tickets\TicketInventoryService;
use App\Services\Tickets\TicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class CheckoutSessionController extends Controller
{
    public function __construct(
        private readonly StripePaymentService $stripe,
        private readonly TicketInventoryService $inventory,
        private readonly TicketService $tickets,
        private readonly OrderService $orders,
    ) {}

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

        if ($this->shouldUseLocalCheckout()) {
            return $this->completeLocalCheckout($order);
        }

        try {
            $session = $this->stripe->createCheckoutSession($order);
        } catch (Throwable $exception) {
            $this->orders->cancelUnpaidOrder($order, Order::PAYMENT_STATUS_FAILED);

            throw $exception;
        }

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

    protected function shouldUseLocalCheckout(): bool
    {
        $secret = config('services.stripe.secret');

        return app()->environment(['local', 'testing']) && (! is_string($secret) || $secret === '');
    }

    protected function completeLocalCheckout(Order $order): JsonResponse
    {
        if ($order->checkout_expires_at && $order->checkout_expires_at->isPast()) {
            $this->orders->cancelUnpaidOrder($order, Order::PAYMENT_STATUS_CANCELLED);

            throw ValidationException::withMessages([
                'order' => 'This checkout session has expired. Please start checkout again.',
            ]);
        }

        try {
            $order = DB::transaction(function () use ($order): Order {
                $locked = Order::query()
                    ->with(['items.ticketType'])
                    ->whereKey($order->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($locked->payment_status !== Order::PAYMENT_STATUS_PAID) {
                    foreach ($locked->items as $item) {
                        $this->inventory->commitSale($item->ticketType, $item->quantity);
                    }

                    $this->tickets->generateForPaidOrder($locked);

                    $locked->forceFill([
                        'status' => Order::STATUS_PAID,
                        'payment_status' => Order::PAYMENT_STATUS_PAID,
                        'payment_provider' => 'local',
                        'payment_reference' => 'local-'.$locked->order_number,
                        'paid_at' => now(),
                    ])->save();
                }

                return $locked->fresh(['tickets', 'items']);
            });
        } catch (Throwable $exception) {
            $this->orders->cancelUnpaidOrder($order, Order::PAYMENT_STATUS_FAILED);

            throw $exception;
        }

        $checkoutUrl = str_replace(
            ['{CHECKOUT_SESSION_ID}', '{ORDER_ID}', '{ORDER_NUMBER}'],
            ['local-'.$order->id, (string) $order->id, urlencode($order->order_number)],
            (string) config('services.stripe.success_url'),
        );

        return response()->json([
            'data' => [
                'checkout_session_id' => 'local-'.$order->id,
                'checkout_url' => $checkoutUrl,
                'payment_status' => $order->payment_status,
                'order' => [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'total' => $order->total,
                    'currency' => $order->currency,
                ],
            ],
        ], 201);
    }
}
