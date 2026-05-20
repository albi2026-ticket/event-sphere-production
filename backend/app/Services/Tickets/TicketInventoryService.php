<?php

namespace App\Services\Tickets;

use App\Models\TicketType;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TicketInventoryService
{
    public function availableQuantity(TicketType $ticketType): int
    {
        return $ticketType->availableQuantity();
    }

    public function adjustTotal(TicketType $ticketType, int $quantityTotal, ?string $status = null): TicketType
    {
        return DB::transaction(function () use ($ticketType, $quantityTotal, $status): TicketType {
            $locked = TicketType::query()->whereKey($ticketType->id)->lockForUpdate()->firstOrFail();

            $minimumAllowed = $locked->quantity_sold + $locked->quantity_reserved;

            if ($quantityTotal < $minimumAllowed) {
                throw ValidationException::withMessages([
                    'quantity_total' => "Total inventory cannot be lower than sold plus reserved tickets ({$minimumAllowed}).",
                ]);
            }

            $locked->quantity_total = $quantityTotal;

            if ($status) {
                $locked->status = $status;
            } elseif ($locked->availableQuantity() === 0 && $locked->status === TicketType::STATUS_ACTIVE) {
                $locked->status = TicketType::STATUS_SOLD_OUT;
            } elseif ($locked->availableQuantity() > 0 && $locked->status === TicketType::STATUS_SOLD_OUT) {
                $locked->status = TicketType::STATUS_ACTIVE;
            }

            $locked->save();

            return $locked->fresh();
        });
    }

    public function reserve(TicketType $ticketType, int $quantity): TicketType
    {
        return DB::transaction(function () use ($ticketType, $quantity): TicketType {
            $locked = TicketType::query()->whereKey($ticketType->id)->lockForUpdate()->firstOrFail();

            $this->ensurePurchasable($locked, $quantity);

            $locked->increment('quantity_reserved', $quantity);

            return $locked->fresh();
        });
    }

    public function release(TicketType $ticketType, int $quantity): TicketType
    {
        return DB::transaction(function () use ($ticketType, $quantity): TicketType {
            $locked = TicketType::query()->whereKey($ticketType->id)->lockForUpdate()->firstOrFail();
            $locked->quantity_reserved = max(0, $locked->quantity_reserved - $quantity);
            $locked->save();

            return $locked->fresh();
        });
    }

    public function commitSale(TicketType $ticketType, int $quantity): TicketType
    {
        return DB::transaction(function () use ($ticketType, $quantity): TicketType {
            $locked = TicketType::query()->whereKey($ticketType->id)->lockForUpdate()->firstOrFail();

            if ($locked->quantity_reserved >= $quantity) {
                $locked->quantity_reserved -= $quantity;
            } else {
                $this->ensurePurchasable($locked, $quantity);
            }

            $locked->quantity_sold += $quantity;

            if ($locked->availableQuantity() === 0 && $locked->status === TicketType::STATUS_ACTIVE) {
                $locked->status = TicketType::STATUS_SOLD_OUT;
            }

            $locked->save();

            return $locked->fresh();
        });
    }

    protected function ensurePurchasable(TicketType $ticketType, int $quantity): void
    {
        if (! $ticketType->isOnSale()) {
            throw ValidationException::withMessages([
                'ticket_type' => 'This ticket type is not currently on sale.',
            ]);
        }

        if ($quantity < $ticketType->min_per_order || $quantity > $ticketType->max_per_order) {
            throw ValidationException::withMessages([
                'quantity' => "Quantity must be between {$ticketType->min_per_order} and {$ticketType->max_per_order}.",
            ]);
        }

        if ($ticketType->availableQuantity() < $quantity) {
            throw ValidationException::withMessages([
                'quantity' => 'Not enough tickets are available.',
            ]);
        }
    }
}
