<?php

namespace App\Http\Resources;

use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VenueOpeningHourResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return Profiler::section('VenueOpeningHourResource::toArray', fn (): array => [
            'id' => $this->id,
            'venue_id' => $this->venue_id,
            'day_of_week' => $this->day_of_week,
            'opens_at' => Profiler::section('VenueOpeningHourResource opens_at formatTime', fn (): ?string => $this->formatTime($this->opens_at)),
            'closes_at' => Profiler::section('VenueOpeningHourResource closes_at formatTime', fn (): ?string => $this->formatTime($this->closes_at)),
            'is_closed' => $this->is_closed,
        ]);
    }

    protected function formatTime(mixed $value): ?string
    {
        if (! $value) {
            return null;
        }

        return substr((string) $value, 0, 5);
    }
}
