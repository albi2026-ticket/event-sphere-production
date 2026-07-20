<?php

namespace App\Http\Resources;

use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VenueBlackoutDateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return Profiler::section('VenueBlackoutDateResource::toArray', fn (): array => [
            'id' => $this->id,
            'venue_id' => $this->venue_id,
            'date' => $this->date?->format('Y-m-d'),
            'reason' => $this->reason,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ]);
    }
}
