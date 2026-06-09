Event Cancelled - {{ $event->title }}

We regret to inform you that the event "{{ $event->title }}" has been cancelled.

Your ticket(s) are no longer valid for entry.

Our team will contact you regarding the refund process or any next steps that apply.

We apologize for the inconvenience and appreciate your understanding.

Event Details:
- Event Name: {{ $event->title }}
- Date: {{ $emailData['event_date'] }}
- Location: {{ $emailData['location'] }}
- Order Number: {{ $order->order_number }}

Event Sphere Team
