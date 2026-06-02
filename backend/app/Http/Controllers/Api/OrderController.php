<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\Orders\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $order = $this->orders->create(
            $request->user(),
            $validated['items'],
            $validated,
        );

        return (new OrderResource($order))->response()->setStatusCode(201);
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()?->id || $request->user()?->isAdmin(), 403);
        abort_if($order->payment_status === Order::PAYMENT_STATUS_PAID, 422, 'Paid orders cannot be cancelled from checkout.');

        $order = $this->orders->cancelUnpaidOrder($order);

        return (new OrderResource($order))->response();
    }
}
