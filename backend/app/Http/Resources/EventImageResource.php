<?php

namespace App\Http\Resources;

use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventImageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return Profiler::section('EventImageResource::toArray', function (): array {
            $url = Profiler::section('EventImageResource publicUrl accessor', fn (): string => $this->publicUrl());

            return Profiler::section('EventImageResource payload array build', fn (): array => [
                'id' => $this->id,
                'event_id' => $this->event_id,
                'url' => $url,
                'optimized_url' => $url,
                'original_name' => $this->original_name,
                'mime_type' => $this->mime_type,
                'size' => $this->size,
                'width' => $this->width,
                'height' => $this->height,
                'alt_text' => $this->alt_text,
                'type' => $this->type,
                'sort_order' => $this->sort_order,
                'is_primary' => $this->is_primary,
                'is_banner' => $this->is_banner,
                'role' => $this->is_primary
                    ? 'primary'
                    : ($this->is_banner ? 'banner' : 'gallery'),
                'created_at' => $this->created_at,
                'updated_at' => $this->updated_at,
            ]);
        });
    }
}
