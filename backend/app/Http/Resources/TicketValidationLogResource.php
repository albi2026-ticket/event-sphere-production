<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketValidationLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'result' => $this->result,
            'method' => $this->method,
            'scanned_at' => $this->scanned_at,
            'attendee' => [
                'name' => $this->attendee_name,
                'email' => $this->attendee_email,
            ],
            'ticket_code' => $this->ticket_code,
            'ticket_uuid' => $this->ticket_uuid,
            'message' => $this->message,
            'event' => $this->whenLoaded('event', fn () => [
                'id' => $this->event?->id,
                'title' => $this->event?->title,
                'starts_at' => $this->event?->starts_at,
                'timezone' => $this->event?->timezone,
            ]),
            'ticket' => $this->whenLoaded('ticket', fn () => $this->ticket ? [
                'id' => $this->ticket->id,
                'ticket_code' => $this->ticket->ticket_code,
                'ticket_uuid' => $this->ticket->ticket_uuid,
                'status' => $this->ticket->status,
                'checked_in_at' => $this->ticket->checked_in_at,
            ] : null),
            'scanner' => $this->whenLoaded('scanner', fn () => $this->scanner ? [
                'id' => $this->scanner->id,
                'name' => $this->scanner->name,
                'email' => $this->scanner->email,
                'role' => $this->scanner->role,
            ] : null),
            'created_at' => $this->created_at,
        ];
    }
}
