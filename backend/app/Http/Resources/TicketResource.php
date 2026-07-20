<?php

namespace App\Http\Resources;

use App\Support\AppUrls;
use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return Profiler::section('TicketResource::toArray', function (): array {
            $purchaser = Profiler::section('TicketResource purchaser relation read', fn () => $this->resource->relationLoaded('user') ? $this->user : null);
            $qrCodeUrl = Profiler::section('TicketResource qr_code_url helper', fn (): string => AppUrls::api("/tickets/{$this->id}/qr-code"));
            $downloadUrl = Profiler::section('TicketResource download_url helper', fn (): string => AppUrls::api("/tickets/{$this->id}/download"));

            return Profiler::section('TicketResource payload array build', fn (): array => [
                'id' => $this->id,
                'ticket_uuid' => $this->ticket_uuid,
                'ticket_code' => $this->ticket_code,
                'status' => $this->status,
                'seat_label' => $this->seat_label,
                'qr_code_url' => $qrCodeUrl,
                'download_url' => $downloadUrl,
                'issued_at' => $this->issued_at,
                'scanner_id' => $this->checked_in_by,
                'checked_in_at' => $this->checked_in_at,
                'checked_in_by' => $this->whenLoaded('checkedInBy', fn () => Profiler::section('TicketResource checkedInBy transform', fn (): array => [
                    'id' => $this->checkedInBy->id,
                    'name' => $this->checkedInBy->name,
                ])),
                'device' => $this->checked_in_method,
                'checked_in_method' => $this->checked_in_method,
                'downloaded_at' => $this->downloaded_at,
                'download_count' => $this->download_count,
                'attendee' => Profiler::section('TicketResource attendee transform', fn (): array => [
                    'name' => $this->attendee_name ?: ($purchaser->name ?? null),
                    'email' => $this->attendee_email ?: ($purchaser->email ?? null),
                    'phone' => $this->attendee_phone ?: ($purchaser->phone ?? null),
                ]),
                'purchaser' => $this->whenLoaded('user', fn () => Profiler::section('TicketResource purchaser transform', fn (): array => [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                    'phone' => $this->user->phone,
                ])),
                'event' => $this->whenLoaded('event', fn () => Profiler::section('TicketResource event transform', fn (): array => [
                    'id' => $this->event->id,
                    'title' => $this->event->title,
                    'slug' => $this->event->slug,
                    'status' => $this->event->status,
                    'venue_name' => $this->event->venue_name,
                    'city' => $this->event->city,
                    'country' => $this->event->country,
                    'starts_at' => $this->event->starts_at,
                    'ends_at' => $this->event->ends_at,
                    'timezone' => $this->event->timezone ?: 'Europe/Pristina',
                    'organizer_id' => $this->event->organizer_id,
                    'service_fee_percentage' => $this->event->service_fee_percentage ?? 10,
                ])),
                'ticket_type' => $this->whenLoaded('ticketType', fn () => Profiler::section('TicketResource ticketType transform', fn (): array => [
                    'id' => $this->ticketType->id,
                    'name' => $this->ticketType->name,
                    'price' => $this->ticketType->price,
                    'currency' => $this->ticketType->currency,
                ])),
                'order' => $this->whenLoaded('order', fn () => Profiler::section('TicketResource order transform', fn (): array => [
                    'id' => $this->order->id,
                    'order_number' => $this->order->order_number,
                    'status' => $this->order->status,
                    'payment_status' => $this->order->payment_status,
                    'total' => $this->order->total,
                    'currency' => $this->order->currency,
                    'created_at' => $this->order->created_at,
                    'purchaser' => [
                        'name' => $this->order->relationLoaded('user') ? $this->order->user?->name : null,
                        'email' => $this->order->relationLoaded('user') ? $this->order->user?->email : null,
                    ],
                ])),
                'created_at' => $this->created_at,
                'updated_at' => $this->updated_at,
            ]);
        });
    }
}
