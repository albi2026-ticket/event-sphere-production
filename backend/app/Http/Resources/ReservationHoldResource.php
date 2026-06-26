<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationHoldResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'venue_id' => $this->venue_id,
            'user_id' => $this->user_id,
            'party_size' => $this->party_size,
            'reservation_date' => $this->reservation_date?->format('Y-m-d'),
            'reservation_time' => substr((string) $this->reservation_time, 0, 5),
            'status' => $this->status,
            'reserved_at' => $this->reserved_at,
            'expires_at' => $this->expires_at,
            'seconds_remaining' => $this->expires_at ? max(0, now()->diffInSeconds($this->expires_at, false)) : 0,
        ];
    }
}
