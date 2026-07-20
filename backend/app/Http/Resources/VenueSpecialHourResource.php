<?php

namespace App\Http\Resources;

use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VenueSpecialHourResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return Profiler::section('VenueSpecialHourResource::toArray', fn (): array => [
            'id' => $this->id,
            'venue_id' => $this->venue_id,
            'date' => $this->date?->format('Y-m-d'),
            'opens_at' => Profiler::section('VenueSpecialHourResource opens_at formatTime', fn (): ?string => $this->formatTime($this->opens_at)),
            'closes_at' => Profiler::section('VenueSpecialHourResource closes_at formatTime', fn (): ?string => $this->formatTime($this->closes_at)),
            'is_closed' => $this->is_closed,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ]);
    }

    private function formatTime(mixed $value): ?string
    {
        if (! $value) {
            return null;
        }

        return substr((string) $value, 0, 5);
    }
}
