{{ __('emails.ticket_order_subject', ['order' => $order->order_number]) }}

{{ __('emails.tickets_confirmed') }}

{{ __('emails.order_information') }}
{{ __('emails.order_number') }}: {{ $order->order_number }}
{{ __('emails.purchase_date') }}: {{ $emailData['purchase_date'] }}
{{ __('emails.payment_status') }}: {{ $order->payment_status }}

{{ __('emails.purchaser') }}
{{ __('emails.name') }}: {{ $emailData['purchaser_name'] }}
{{ __('emails.email') }}: {{ $emailData['purchaser_email'] }}

@foreach ($emailData['items'] as $item)
{{ __('emails.event') }}
{{ __('emails.name') }}: {{ $item['event_name'] }}
{{ __('emails.date') }}: {{ $item['event_date'] }}
{{ __('emails.time') }}: {{ $item['event_time'] }}
{{ __('emails.timezone') }}: {{ $item['timezone_label'] }}
{{ __('emails.venue') }}: {{ $item['venue'] }}

{{ __('emails.tickets') }}
{{ __('emails.ticket_type') }}: {{ $item['ticket_type'] }}
{{ __('emails.quantity') }}: {{ $item['quantity'] }}
{{ __('emails.price_per_ticket') }}: {{ $item['price_per_ticket'] }}
{{ __('emails.service_fee') }}: {{ $item['service_fee'] }}
{{ __('emails.total_paid') }}: {{ $item['total_paid'] }}

{{ __('emails.attendees') }}
@forelse ($item['attendees'] as $attendee)
- {{ $attendee['name'] }}@if (! empty($attendee['email'])) ({{ $attendee['email'] }})@endif
@empty
- {{ __('emails.no_attendee_details') }}
@endforelse

@endforeach
{{ __('emails.order_total') }}
{{ __('emails.subtotal') }}: {{ strtoupper($order->currency) }} {{ number_format((float) $order->subtotal, 2) }}
{{ __('emails.service_fee') }}: {{ strtoupper($order->currency) }} {{ number_format((float) $order->service_fee, 2) }}
{{ __('emails.total_paid') }}: {{ strtoupper($order->currency) }} {{ number_format((float) $order->total, 2) }}

{{ __('emails.ticket_access') }}
{{ __('emails.my_tickets') }}: {{ $emailData['my_tickets_url'] }}
{{ __('emails.view_tickets') }}: {{ $emailData['my_tickets_url'] }}

@if ($emailData['has_qr_tickets'])
{{ __('emails.qr_tickets') }}
{{ __('emails.qr_ticket_text_copy') }}
@foreach ($emailData['tickets'] as $ticket)
- {{ $ticket['code'] }} - {{ $ticket['attendee_name'] }}
  {{ __('emails.download_view') }}: {{ $ticket['download_url'] }}
  {{ __('emails.qr_code') }}: {{ $ticket['qr_url'] }}
@endforeach
@endif

{{ __('emails.order_confirmation_footer') }}
