<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VenueOpeningHourResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'venue_id' => $this->venue_id,
            'day_of_week' => $this->day_of_week,
            'opens_at' => $this->formatTime($this->opens_at),
            'closes_at' => $this->formatTime($this->closes_at),
            'is_closed' => $this->is_closed,
        ];
    }

    protected function formatTime(mixed $value): ?string
    {
        if (! $value) {
            return null;
        }

        return substr((string) $value, 0, 5);
    }
}
