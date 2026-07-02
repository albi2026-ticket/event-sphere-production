{{ __('emails.event_successfully_cancelled') }}

{{ __('emails.event_cancel_recorded') }}

{{ __('emails.event_name') }}: {{ $event->title }}
{{ __('emails.ticket_holders_notified_label') }}: {{ $emailData['ticket_holders_notified'] }}
{{ __('emails.cancellation_timestamp') }}: {{ $emailData['cancelled_at'] }}
