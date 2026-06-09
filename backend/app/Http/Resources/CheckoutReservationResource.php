<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CheckoutReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'event_id' => $this->event_id,
            'ticket_type_id' => $this->ticket_type_id,
            'order_id' => $this->order_id,
            'quantity' => $this->quantity,
            'status' => $this->status,
            'reserved_at' => $this->reserved_at,
            'expires_at' => $this->expires_at,
            'seconds_remaining' => $this->expires_at ? max(0, now()->diffInSeconds($this->expires_at, false)) : 0,
        ];
    }
}
