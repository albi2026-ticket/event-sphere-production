Event Sphere order confirmation

Your tickets are confirmed.

Order information
Order Number: {{ $order->order_number }}
Purchase Date: {{ $emailData['purchase_date'] }}
Payment Status: {{ $order->payment_status }}

Purchaser
Name: {{ $emailData['purchaser_name'] }}
Email: {{ $emailData['purchaser_email'] }}

@foreach ($emailData['items'] as $item)
Event
Name: {{ $item['event_name'] }}
Date: {{ $item['event_date'] }}
Time: {{ $item['event_time'] }}
Timezone: {{ $item['timezone_label'] }}
Venue: {{ $item['venue'] }}

Tickets
Ticket Type: {{ $item['ticket_type'] }}
Quantity: {{ $item['quantity'] }}
Price Per Ticket: {{ $item['price_per_ticket'] }}
Service Fee: {{ $item['service_fee'] }}
Total Paid: {{ $item['total_paid'] }}

Attendees
@forelse ($item['attendees'] as $attendee)
- {{ $attendee['name'] }}@if (! empty($attendee['email'])) ({{ $attendee['email'] }})@endif
@empty
- No attendee details were provided.
@endforelse

@endforeach
Order total
Subtotal: {{ strtoupper($order->currency) }} {{ number_format((float) $order->subtotal, 2) }}
Service Fee: {{ strtoupper($order->currency) }} {{ number_format((float) $order->service_fee, 2) }}
Total Paid: {{ strtoupper($order->currency) }} {{ number_format((float) $order->total, 2) }}

Ticket access
My Tickets: {{ $emailData['my_tickets_url'] }}
View Tickets: {{ $emailData['my_tickets_url'] }}

@if ($emailData['has_qr_tickets'])
QR tickets
Each issued ticket includes QR access for check-in.
@foreach ($emailData['tickets'] as $ticket)
- {{ $ticket['code'] }} - {{ $ticket['attendee_name'] }}
  Download/View: {{ $ticket['download_url'] }}
  QR code: {{ $ticket['qr_url'] }}
@endforeach
@endif

This confirmation was sent by Event Sphere after successful payment.
