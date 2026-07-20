<?php

namespace App\Http\Resources;

use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VenueFacilityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return Profiler::section('VenueFacilityResource::toArray', fn (): array => [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'icon' => $this->icon,
        ]);
    }
}
