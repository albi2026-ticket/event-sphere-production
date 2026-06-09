<?php

namespace App\Services\Orders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\TicketType;
use App\Models\User;
use App\Models\CheckoutReservation;
use App\Services\Checkout\CheckoutReservationService;
use App\Services\Tickets\TicketInventoryService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(
        private readonly TicketInventoryService $inventory,
        private readonly CheckoutReservationService $checkoutReservations,
    ) {}

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

        $this->releaseExpiredReservations();
        $this->checkoutReservations->expireStaleReservations($user);

        return DB::transaction(function () use ($user, $items, $billing): Order {
            $checkoutReservation = isset($billing['checkout_reservation_id'])
                ? $this->checkoutReservations->validateForOrder($user, (int) $billing['checkout_reservation_id'], $items)
                : null;
            $lineItems = [];
            $requestedByEvent = [];
            $attendeeCursor = 0;
            $attendees = collect($billing['attendees'] ?? [])
                ->map(fn (array $attendee): array => [
                    'name' => trim((string) ($attendee['name'] ?? '')),
                    'email' => strtolower(trim((string) ($attendee['email'] ?? ''))),
                    'phone' => trim((string) ($attendee['phone'] ?? '')) ?: null,
                ])
                ->values()
                ->all();
            $subtotal = 0.0;
            $currency = 'USD';

            foreach ($items as $line) {
                $ticketType = TicketType::query()
                    ->with('event')
                    ->whereKey($line['ticket_type_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                $quantity = (int) $line['quantity'];
                if ($ticketType->event?->salesAreClosed()) {
                    throw ValidationException::withMessages([
                        'items' => 'Ticket sales are closed for this event.',
                    ]);
                }

                $this->inventory->reserve($ticketType, $quantity, $checkoutReservation?->id);
                $ticketType = $ticketType->fresh();
                $event = $ticketType->event;
                $requestedByEvent[$event->id] = ($requestedByEvent[$event->id] ?? 0) + $quantity;

                $unitPrice = (float) $ticketType->price;
                $lineTotal = round($unitPrice * $quantity, 2);
                $serviceFeePercentage = (float) ($event->service_fee_percentage ?? 10);
                $lineFee = round($lineTotal * ($serviceFeePercentage / 100), 2);
                $subtotal += $lineTotal;
                $currency = strtoupper($ticketType->currency ?: $ticketType->event->currency ?: $currency);
                $lineAttendees = array_slice($attendees, $attendeeCursor, $quantity);
                $attendeeCursor += $quantity;

                $lineItems[] = [
                    'ticket_type' => $ticketType,
                    'event' => $event,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'service_fee' => $lineFee,
                    'total' => $lineTotal + $lineFee,
                    'attendee_details' => $lineAttendees,
                ];
            }

            foreach ($lineItems as $line) {
                $event = $line['event'];
                $limit = $event->max_tickets_per_user;

                if (! $limit) {
                    continue;
                }

                $alreadyReservedOrPurchased = OrderItem::query()
                    ->where('event_id', $event->id)
                    ->whereHas('order', function ($query) use ($user): void {
                        $query
                            ->where('user_id', $user->id)
                            ->whereNotIn('status', [Order::STATUS_CANCELLED, Order::STATUS_REFUNDED])
                            ->whereNotIn('payment_status', [
                                Order::PAYMENT_STATUS_FAILED,
                                Order::PAYMENT_STATUS_CANCELLED,
                                Order::PAYMENT_STATUS_REFUNDED,
                            ]);
                    })
                    ->sum('quantity');

                $requested = $requestedByEvent[$event->id] ?? 0;

                if ($alreadyReservedOrPurchased + $requested > $limit) {
                    $remaining = max(0, $limit - $alreadyReservedOrPurchased);

                    throw ValidationException::withMessages([
                        'items' => $remaining > 0
                            ? "This event has a limit of {$limit} ticket(s) per user. You can buy {$remaining} more."
                            : "This event has a limit of {$limit} ticket(s) per user, and you have already reached it.",
                    ]);
                }
            }

            $serviceFee = round(array_sum(array_column($lineItems, 'service_fee')), 2);
            $discount = (float) ($billing['discount_total'] ?? 0);
            $tax = (float) ($billing['tax_total'] ?? 0);
            $total = max(0, round($subtotal + $serviceFee + $tax - $discount, 2));

            $order = Order::query()->create([
                'user_id' => $user->id,
                'order_number' => $this->generateOrderNumber(),
                'status' => Order::STATUS_PENDING,
                'payment_status' => Order::PAYMENT_STATUS_UNPAID,
                'subtotal' => $subtotal,
                'service_fee' => $serviceFee,
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
                'checkout_expires_at' => $checkoutReservation?->expires_at ?: now()->addMinutes(30),
                'checkout_reservation_id' => $checkoutReservation?->id,
            ]);

            foreach ($lineItems as $line) {
                $ticketType = $line['ticket_type'];
                $event = $line['event'];

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
                    'attendee_details' => $line['attendee_details'],
                ]);
            }

            if ($checkoutReservation) {
                $this->checkoutReservations->attachOrder($checkoutReservation, $order);
            }

            return $order->load(['items.event', 'items.ticketType']);
        });
    }

    public function releaseReservations(Order $order): void
    {
        DB::transaction(function () use ($order): void {
            $order->loadMissing('items.ticketType');

            $this->releaseReservationItems($order);
        });
    }

    public function releaseExpiredReservations(?User $user = null): int
    {
        $query = Order::query()
            ->where('status', Order::STATUS_PENDING)
            ->whereIn('payment_status', [
                Order::PAYMENT_STATUS_UNPAID,
                Order::PAYMENT_STATUS_PENDING,
            ])
            ->whereNotNull('checkout_expires_at')
            ->where('checkout_expires_at', '<', now());

        if ($user) {
            $query->where('user_id', $user->id);
        }

        $released = 0;

        $query
            ->pluck('id')
            ->each(function (int $orderId) use (&$released): void {
                $order = Order::query()->find($orderId);

                if (! $order) {
                    return;
                }

                $this->checkoutReservations->cancelForOrder($order, CheckoutReservation::STATUS_EXPIRED);
                $this->cancelUnpaidOrder($order, Order::PAYMENT_STATUS_CANCELLED);
                $released++;
            });

        return $released;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function cancelUnpaidOrder(
        Order $order,
        string $paymentStatus = Order::PAYMENT_STATUS_CANCELLED,
        array $attributes = [],
    ): Order {
        return DB::transaction(function () use ($order, $paymentStatus, $attributes): Order {
            $locked = Order::query()
                ->with(['items.ticketType'])
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->payment_status === Order::PAYMENT_STATUS_PAID) {
                return $locked->fresh(['items.event', 'items.ticketType', 'tickets']);
            }

            if (! in_array($locked->payment_status, [
                Order::PAYMENT_STATUS_CANCELLED,
                Order::PAYMENT_STATUS_FAILED,
                Order::PAYMENT_STATUS_REFUNDED,
            ], true)) {
                $this->checkoutReservations->cancelForOrder($locked);
                $this->releaseReservationItems($locked);

                $status = $paymentStatus === Order::PAYMENT_STATUS_CANCELLED
                    ? Order::STATUS_CANCELLED
                    : $locked->status;

                $locked->forceFill(array_merge([
                    'status' => $status,
                    'payment_status' => $paymentStatus,
                    'cancelled_at' => $paymentStatus === Order::PAYMENT_STATUS_CANCELLED ? now() : $locked->cancelled_at,
                ], $attributes))->save();
            }

            return $locked->fresh(['items.event', 'items.ticketType', 'tickets']);
        });
    }

    protected function releaseReservationItems(Order $order): void
    {
        foreach ($order->items as $item) {
            if ($item->ticketType) {
                $this->inventory->release($item->ticketType, $item->quantity);
            }
        }
    }

    protected function generateOrderNumber(): string
    {
        do {
            $number = 'ES-'.now()->format('Y').'-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (Order::query()->where('order_number', $number)->exists());

        return $number;
    }
}
