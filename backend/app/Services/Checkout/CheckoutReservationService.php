<?php

namespace App\Services\Checkout;

use App\Models\CheckoutReservation;
use App\Models\Order;
use App\Models\TicketType;
use App\Models\User;
use App\Services\Tickets\TicketInventoryService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutReservationService
{
    public function __construct(private readonly TicketInventoryService $inventory) {}

    public function reserve(User $user, int $ticketTypeId, int $quantity): CheckoutReservation
    {
        return DB::transaction(function () use ($user, $ticketTypeId, $quantity): CheckoutReservation {
            $ticketType = TicketType::query()
                ->with('event')
                ->whereKey($ticketTypeId)
                ->lockForUpdate()
                ->firstOrFail();

            $this->expireStaleReservations($user);

            $existing = CheckoutReservation::query()
                ->where('user_id', $user->id)
                ->where('ticket_type_id', $ticketType->id)
                ->where('status', CheckoutReservation::STATUS_ACTIVE)
                ->whereNull('order_id')
                ->lockForUpdate()
                ->first();

            if ($existing && $existing->expires_at->isFuture() && $existing->quantity === $quantity) {
                return $existing->fresh(['ticketType', 'event']);
            }

            if ($existing) {
                $existing->forceFill(['status' => CheckoutReservation::STATUS_CANCELLED])->save();
            }

            $available = $this->inventory->availableQuantity($ticketType);

            if ($ticketType->event?->salesAreClosed()) {
                throw ValidationException::withMessages([
                    'reservation' => 'Ticket sales are closed for this event.',
                ]);
            }

            if (! $ticketType->isOnSale()) {
                throw ValidationException::withMessages([
                    'reservation' => 'This ticket type is not currently on sale.',
                ]);
            }

            if ($quantity < $ticketType->min_per_order) {
                throw ValidationException::withMessages([
                    'quantity' => "Quantity must be at least {$ticketType->min_per_order}.",
                ]);
            }

            $eventLimit = $ticketType->event?->max_tickets_per_user;
            if ($eventLimit && $quantity > $eventLimit) {
                throw ValidationException::withMessages([
                    'quantity' => "This event has a limit of {$eventLimit} ticket(s) per user.",
                ]);
            }

            if ($available < $quantity) {
                throw ValidationException::withMessages([
                    'quantity' => 'Not enough tickets are available.',
                ]);
            }

            return CheckoutReservation::query()->create([
                'user_id' => $user->id,
                'event_id' => $ticketType->event_id,
                'ticket_type_id' => $ticketType->id,
                'quantity' => $quantity,
                'reserved_at' => now(),
                'expires_at' => now()->addMinutes($this->expirationMinutes()),
                'status' => CheckoutReservation::STATUS_ACTIVE,
            ])->load(['ticketType', 'event']);
        });
    }

    /**
     * @param  array<int, array{ticket_type_id: int, quantity: int}>  $items
     */
    public function validateForOrder(User $user, int $reservationId, array $items): CheckoutReservation
    {
        $reservation = CheckoutReservation::query()
            ->whereKey($reservationId)
            ->where('user_id', $user->id)
            ->lockForUpdate()
            ->firstOrFail();

        $this->ensureActive($reservation);

        if ($reservation->order_id !== null) {
            throw ValidationException::withMessages([
                'checkout_reservation_id' => 'This reservation has already been used.',
            ]);
        }

        if (count($items) !== 1
            || (int) ($items[0]['ticket_type_id'] ?? 0) !== $reservation->ticket_type_id
            || (int) ($items[0]['quantity'] ?? 0) !== $reservation->quantity) {
            throw ValidationException::withMessages([
                'checkout_reservation_id' => 'Reservation does not match the selected tickets.',
            ]);
        }

        return $reservation;
    }

    public function attachOrder(CheckoutReservation $reservation, Order $order): CheckoutReservation
    {
        $reservation->forceFill([
            'order_id' => $order->id,
        ])->save();

        $order->forceFill([
            'checkout_reservation_id' => $reservation->id,
            'checkout_expires_at' => $reservation->expires_at,
        ])->save();

        return $reservation->fresh();
    }

    public function ensureOrderReservationIsPayable(Order $order): ?CheckoutReservation
    {
        if (! $order->checkout_reservation_id) {
            return null;
        }

        $reservation = CheckoutReservation::query()
            ->whereKey($order->checkout_reservation_id)
            ->lockForUpdate()
            ->firstOrFail();

        $this->ensureActive($reservation);

        if ((int) $reservation->order_id !== (int) $order->id) {
            throw ValidationException::withMessages([
                'reservation' => 'Reservation does not belong to this order.',
            ]);
        }

        return $reservation;
    }

    public function completeForOrder(Order $order): void
    {
        if (! $order->checkout_reservation_id) {
            return;
        }

        CheckoutReservation::query()
            ->whereKey($order->checkout_reservation_id)
            ->where('status', CheckoutReservation::STATUS_ACTIVE)
            ->update(['status' => CheckoutReservation::STATUS_COMPLETED]);
    }

    public function cancelForOrder(Order $order, string $status = CheckoutReservation::STATUS_CANCELLED): void
    {
        if (! $order->checkout_reservation_id) {
            return;
        }

        CheckoutReservation::query()
            ->whereKey($order->checkout_reservation_id)
            ->where('status', CheckoutReservation::STATUS_ACTIVE)
            ->update(['status' => $status]);
    }

    public function expireStaleReservations(?User $user = null): int
    {
        return CheckoutReservation::query()
            ->where('status', CheckoutReservation::STATUS_ACTIVE)
            ->whereNull('order_id')
            ->where('expires_at', '<', now())
            ->when($user, fn ($query) => $query->where('user_id', $user->id))
            ->update(['status' => CheckoutReservation::STATUS_EXPIRED]);
    }

    protected function ensureActive(CheckoutReservation $reservation): void
    {
        if ($reservation->status !== CheckoutReservation::STATUS_ACTIVE) {
            throw ValidationException::withMessages([
                'reservation' => 'This reservation is no longer active.',
            ]);
        }

        if ($reservation->expires_at->isPast()) {
            $reservation->forceFill(['status' => CheckoutReservation::STATUS_EXPIRED])->save();

            throw ValidationException::withMessages([
                'reservation' => 'Your reservation has expired.',
            ]);
        }
    }

    protected function expirationMinutes(): int
    {
        return max(1, (int) config('services.checkout.reservation_minutes', 5));
    }
}
