<?php

namespace App\Http\Controllers\Api\Payments;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Tickets\TicketInventoryService;
use App\Services\Tickets\TicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MockPaymentController extends Controller
{
    public function __construct(
        private readonly TicketInventoryService $inventory,
        private readonly TicketService $tickets,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
        ]);

        $order = Order::query()
            ->whereKey($validated['order_id'])
            ->firstOrFail();

        abort_unless($order->user_id === $request->user()?->id || $request->user()?->isAdmin(), 403);

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
                    'payment_provider' => 'mock',
                    'payment_reference' => 'mock-'.$locked->order_number,
                    'paid_at' => now(),
                ])->save();
            }

            return $locked->fresh(['items', 'tickets']);
        });

        return response()->json([
            'data' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'payment_provider' => $order->payment_provider,
                'paid_at' => $order->paid_at,
                'checkout_url' => "checkout-success.html?order_id={$order->id}&mock=1",
                'tickets_count' => $order->tickets->count(),
            ],
        ]);
    }
}
