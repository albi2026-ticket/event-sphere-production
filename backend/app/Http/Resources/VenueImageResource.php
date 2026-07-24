<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VenueImageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $path = $this->path ?: $this->image_path;
        $url = $this->publicUrl();

        return [
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
        ];
    }
}
