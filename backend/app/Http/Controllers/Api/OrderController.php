<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Services\Orders\OrderService;
use Illuminate\Http\JsonResponse;

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
}
