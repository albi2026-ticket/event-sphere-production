<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FavoriteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'event_id' => $this->event_id,
            'created_at' => $this->created_at,
            'event' => $this->whenLoaded('event', fn () => new EventResource($this->event)),
        ];
    }
}
