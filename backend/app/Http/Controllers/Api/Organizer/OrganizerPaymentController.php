<?php

namespace App\Http\Controllers\Api\Organizer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizerPaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = Order::query()
            ->with(['user:id,name,email', 'items.event:id,title,organizer_id', 'items.ticketType:id,name'])
            ->whereHas('items.event', fn ($query) => $query->where('organizer_id', $request->user()->id))
            ->when($request->filled('payment_status'), fn ($query) => $query->where('payment_status', $request->input('payment_status')))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($orders);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $order->load(['user:id,name,email', 'items.event:id,title,organizer_id', 'items.ticketType:id,name']);

        abort_unless(
            $order->items->contains(fn ($item): bool => $item->event->organizer_id === $request->user()->id),
            403
        );

        return response()->json(['data' => $order]);
    }
}
