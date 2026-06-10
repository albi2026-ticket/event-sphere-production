<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $activeCheckoutReservations = (int) ($this->active_checkout_reserved_quantity ?? $this->activeCheckoutReservedQuantity());
        $available = max(0, $this->quantity_total - $this->quantity_sold - $this->quantity_reserved - $activeCheckoutReservations);
        $onSale = $this->isOnSale();

        return [
            'id' => $this->id,
            'event_id' => $this->event_id,
            'name' => $this->name,
            'description' => $this->description,
            'price' => $this->price,
            'currency' => $this->currency,
            'quantity_total' => $this->quantity_total,
            'quantity_sold' => $this->quantity_sold,
            'quantity_reserved' => $this->quantity_reserved,
            'quantity_checkout_reserved' => $activeCheckoutReservations,
            'quantity_available' => $available,
            'remaining' => $available,
            'min_per_order' => $this->min_per_order,
            'max_per_order' => $this->max_per_order,
            'sale_starts_at' => $this->sale_starts_at,
            'sale_ends_at' => $this->sale_ends_at,
            'status' => $this->status,
            'is_on_sale' => $onSale,
            'is_sold_out' => $available === 0 || $this->status === 'sold_out',
            'is_available' => $onSale && $available > 0,
            'is_vip' => $this->is_vip,
            'is_resale_allowed' => $this->is_resale_allowed,
            'sort_order' => $this->sort_order,
        ];
    }
}
