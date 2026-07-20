<?php

namespace App\Http\Resources;

use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VenueImageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return Profiler::section('VenueImageResource::toArray', function (): array {
            $path = Profiler::section('VenueImageResource path fallback', fn () => $this->path ?: $this->image_path);
            $url = Profiler::section('VenueImageResource publicUrl accessor', fn (): string => $this->publicUrl());

            return Profiler::section('VenueImageResource payload array build', fn (): array => [
                'id' => $this->id,
                'venue_id' => $this->venue_id,
                'image_path' => $path,
                'url' => $url,
                'image_url' => $url,
                'disk' => $this->disk,
                'path' => $path,
                'sort_order' => $this->sort_order,
                'created_at' => $this->created_at,
                'updated_at' => $this->updated_at,
            ]);
        });
    }
}
