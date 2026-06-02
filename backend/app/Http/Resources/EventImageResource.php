<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventImageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $url = $this->publicUrl();

        return [
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
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
