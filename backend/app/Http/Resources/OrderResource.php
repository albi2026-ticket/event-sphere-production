<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $attendeeCount = null;

        if ($this->resource->relationLoaded('tickets')) {
            $attendeeCount = $this->tickets->count();
        } elseif ($this->resource->relationLoaded('items')) {
            $attendeeCount = $this->items->sum('quantity');
        }

        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'subtotal' => $this->subtotal,
            'service_fee' => $this->service_fee,
            'refund_protection_fee' => $this->refund_protection_fee,
            'discount_total' => $this->discount_total,
            'tax_total' => $this->tax_total,
            'total' => $this->total,
            'currency' => $this->currency,
            'promo_code' => $this->promo_code,
            'payment_provider' => $this->payment_provider,
            'purchaser' => [
                'name' => trim($this->billing_first_name.' '.$this->billing_last_name),
                'email' => $this->billing_email,
                'phone' => $this->billing_phone,
                'user' => $this->whenLoaded('user', fn () => [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ]),
            ],
            'attendee_count' => $attendeeCount,
            'paid_at' => $this->paid_at,
            'cancelled_at' => $this->cancelled_at,
            'refunded_at' => $this->refunded_at,
            'receipt_url' => url("/api/me/orders/{$this->id}/receipt"),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'tickets' => TicketResource::collection($this->whenLoaded('tickets')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
