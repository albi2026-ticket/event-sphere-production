<?php

namespace App\Services\Orders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\TicketType;
use App\Models\User;
use App\Services\Tickets\TicketInventoryService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(private readonly TicketInventoryService $inventory) {}

    /**
     * @param  array<int, array{ticket_type_id: int, quantity: int}>  $items
     * @param  array<string, mixed>  $billing
     */
    public function create(User $user, array $items, array $billing): Order
    {
        if ($items === []) {
            throw ValidationException::withMessages([
                'items' => 'At least one ticket is required.',
            ]);
        }

        return DB::transaction(function () use ($user, $items, $billing): Order {
            $lineItems = [];
            $subtotal = 0.0;
            $currency = 'USD';

            foreach ($items as $line) {
                $ticketType = TicketType::query()
                    ->with('event')
                    ->whereKey($line['ticket_type_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                $quantity = (int) $line['quantity'];
                $this->inventory->reserve($ticketType, $quantity);
                $ticketType = $ticketType->fresh();

                $unitPrice = (float) $ticketType->price;
                $lineTotal = round($unitPrice * $quantity, 2);
                $lineFee = round($lineTotal * 0.05, 2);
                $subtotal += $lineTotal;
                $currency = strtoupper($ticketType->currency ?: $ticketType->event->currency ?: $currency);

                $lineItems[] = [
                    'ticket_type' => $ticketType,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'service_fee' => $lineFee,
                    'total' => $lineTotal + $lineFee,
                ];
            }

            $serviceFee = round(array_sum(array_column($lineItems, 'service_fee')), 2);
            $refundProtection = ! empty($billing['refund_protection'])
                ? (float) ($billing['refund_protection_fee'] ?? 4.99)
                : 0.0;
            $discount = (float) ($billing['discount_total'] ?? 0);
            $tax = (float) ($billing['tax_total'] ?? 0);
            $total = max(0, round($subtotal + $serviceFee + $refundProtection + $tax - $discount, 2));

            $order = Order::query()->create([
                'user_id' => $user->id,
                'order_number' => $this->generateOrderNumber(),
                'status' => Order::STATUS_PENDING,
                'payment_status' => Order::PAYMENT_STATUS_UNPAID,
                'subtotal' => $subtotal,
                'service_fee' => $serviceFee,
                'refund_protection_fee' => $refundProtection,
                'discount_total' => $discount,
                'tax_total' => $tax,
                'total' => $total,
                'currency' => $currency,
                'promo_code' => $billing['promo_code'] ?? null,
                'billing_email' => $billing['billing_email'],
                'billing_phone' => $billing['billing_phone'] ?? null,
                'billing_first_name' => $billing['billing_first_name'],
                'billing_last_name' => $billing['billing_last_name'],
                'billing_address' => $billing['billing_address'] ?? null,
                'billing_city' => $billing['billing_city'] ?? null,
                'billing_state' => $billing['billing_state'] ?? null,
                'billing_zip' => $billing['billing_zip'] ?? null,
                'billing_country' => $billing['billing_country'] ?? null,
                'checkout_expires_at' => now()->addMinutes(30),
            ]);

            foreach ($lineItems as $line) {
                $ticketType = $line['ticket_type'];
                $event = $ticketType->event;

                OrderItem::query()->create([
                    'order_id' => $order->id,
                    'event_id' => $event->id,
                    'ticket_type_id' => $ticketType->id,
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'service_fee' => $line['service_fee'],
                    'total' => $line['total'],
                    'ticket_type_name' => $ticketType->name,
                    'event_title' => $event->title,
                    'event_starts_at' => $event->starts_at,
                ]);
            }

            return $order->load(['items.event', 'items.ticketType']);
        });
    }

    public function releaseReservations(Order $order): void
    {
        DB::transaction(function () use ($order): void {
            $order->loadMissing('items.ticketType');

            foreach ($order->items as $item) {
                if ($item->ticketType) {
                    $this->inventory->release($item->ticketType, $item->quantity);
                }
            }
        });
    }

    protected function generateOrderNumber(): string
    {
        do {
            $number = 'ES-'.now()->format('Y').'-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (Order::query()->where('order_number', $number)->exists());

        return $number;
    }
}
