{{ __('emails.event_cancelled') }} - {{ $event->title }}

{{ __('emails.user_event_cancelled_copy', ['event' => $event->title]) }}

{{ __('emails.ticket_no_longer_valid') }}

{{ __('emails.refund_followup') }}

{{ __('emails.apology') }}

{{ __('emails.event_details') }}:
- {{ __('emails.event_name') }}: {{ $event->title }}
- {{ __('emails.date') }}: {{ $emailData['event_date'] }}
- {{ __('emails.location') }}: {{ $emailData['location'] }}
- {{ __('emails.order_number') }}: {{ $order->order_number }}

{{ __('emails.tiketa_team') }}
