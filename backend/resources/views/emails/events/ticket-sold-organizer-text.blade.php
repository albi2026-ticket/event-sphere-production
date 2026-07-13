{{ __('emails.new_ticket_sold') }}

{{ __('emails.organizer_sale_copy', ['event' => $emailData['event_name']]) }}

{{ __('emails.event') }}
{{ __('emails.event_name') }}: {{ $emailData['event_name'] }}
{{ __('emails.event_date') }}: {{ $emailData['event_date'] }}
{{ __('emails.venue') }}: {{ $emailData['venue'] }}

{{ __('emails.buyer') }}
{{ __('emails.buyer_name') }}: {{ $emailData['buyer_name'] }}
{{ __('emails.buyer_email') }}: {{ $emailData['buyer_email'] }}

{{ __('emails.order') }}
{{ __('emails.order_id') }}: {{ $emailData['order_id'] }}
{{ __('emails.purchase_date') }}: {{ $emailData['purchase_date'] }}

{{ __('emails.event_performance') }}
{{ __('emails.tickets_sold') }}: {{ number_format($emailData['tickets_sold']) }}
{{ __('emails.tickets_remaining') }}: {{ number_format($emailData['tickets_remaining']) }}
{{ __('emails.gross_revenue') }}: {{ $emailData['gross_revenue'] }}

{{ __('emails.ticket_summary') }}
@foreach ($emailData['tickets'] as $ticket)
- {{ $ticket['name'] }} | {{ __('emails.quantity') }}: {{ $ticket['quantity'] }} | {{ __('emails.price') }}: {{ $ticket['price'] }} | {{ __('emails.subtotal') }}: {{ $ticket['subtotal'] }}
@endforeach

{{ __('emails.order_total') }}: {{ $emailData['order_total'] }}
{{ __('emails.currency') }}: {{ $emailData['currency'] }}

{{ __('emails.view_orders') }}: {{ $emailData['view_orders_url'] }}

{{ __('emails.view_analytics') }}
{{ __('emails.organizer_dashboard') }}: {{ $emailData['view_analytics_url'] }}
