New Ticket Sold

{{ $emailData['event_name'] }} received a new paid ticket order.

Event
Event Name: {{ $emailData['event_name'] }}
Event Date: {{ $emailData['event_date'] }}
Venue: {{ $emailData['venue'] }}

Buyer
Buyer Name: {{ $emailData['buyer_name'] }}
Buyer Email: {{ $emailData['buyer_email'] }}

Order
Order ID: {{ $emailData['order_id'] }}
Purchase Date: {{ $emailData['purchase_date'] }}

Event Performance
Tickets Sold: {{ number_format($emailData['tickets_sold']) }}
Tickets Remaining: {{ number_format($emailData['tickets_remaining']) }}
Gross Revenue: {{ $emailData['gross_revenue'] }}

Ticket Summary
@foreach ($emailData['tickets'] as $ticket)
- {{ $ticket['name'] }} | Quantity: {{ $ticket['quantity'] }} | Price: {{ $ticket['price'] }} | Subtotal: {{ $ticket['subtotal'] }}
@endforeach

Order Total: {{ $emailData['order_total'] }}
Currency: {{ $emailData['currency'] }}

View Orders: {{ $emailData['view_orders_url'] }}

View full event analytics
Go to Organizer Dashboard: {{ $emailData['view_analytics_url'] }}
