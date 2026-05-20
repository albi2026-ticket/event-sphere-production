<?php

namespace App\Http\Resources\Organizer;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventPerformanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'event_id' => $this['event_id'],
            'title' => $this['title'],
            'slug' => $this['slug'],
            'status' => $this['status'],
            'visibility' => $this['visibility'],
            'starts_at' => $this['starts_at'],
            'tickets_sold' => (int) $this['tickets_sold'],
            'tickets_available' => (int) $this['tickets_available'],
            'tickets_total' => (int) $this['tickets_total'],
            'orders_count' => (int) $this['orders_count'],
            'attendees_count' => (int) $this['attendees_count'],
            'checked_in_count' => (int) $this['checked_in_count'],
            'revenue' => (string) $this['revenue'],
            'currency' => $this['currency'],
            'sold_out_ticket_types_count' => (int) $this['sold_out_ticket_types_count'],
        ];
    }
}
