<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $available = max(0, $this->quantity_total - $this->quantity_sold - $this->quantity_reserved);

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
            'quantity_available' => $available,
            'min_per_order' => $this->min_per_order,
            'max_per_order' => $this->max_per_order,
            'sale_starts_at' => $this->sale_starts_at,
            'sale_ends_at' => $this->sale_ends_at,
            'status' => $this->status,
            'is_vip' => $this->is_vip,
            'is_resale_allowed' => $this->is_resale_allowed,
        ];
    }
}
