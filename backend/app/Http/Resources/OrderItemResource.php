<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'event_id' => $this->event_id,
            'ticket_type_id' => $this->ticket_type_id,
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'service_fee' => $this->service_fee,
            'total' => $this->total,
            'ticket_type_name' => $this->ticket_type_name,
            'event_title' => $this->event_title,
            'event_starts_at' => $this->event_starts_at,
            'event' => $this->whenLoaded('event', fn () => [
                'id' => $this->event->id,
                'title' => $this->event->title,
                'slug' => $this->event->slug,
                'venue_name' => $this->event->venue_name,
                'city' => $this->event->city,
                'country' => $this->event->country,
                'starts_at' => $this->event->starts_at,
            ]),
            'ticket_type' => $this->whenLoaded('ticketType', fn () => [
                'id' => $this->ticketType->id,
                'name' => $this->ticketType->name,
                'price' => $this->ticketType->price,
                'currency' => $this->ticketType->currency,
            ]),
        ];
    }
}
