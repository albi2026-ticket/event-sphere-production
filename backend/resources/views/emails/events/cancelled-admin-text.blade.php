{{ __('emails.admin_event_cancelled_subject') }}

{{ __('emails.admin_event_cancelled_copy') }}

{{ __('emails.event_name') }}: {{ $event->title }}
{{ __('emails.organizer_name') }}: {{ $emailData['organizer_name'] }}
{{ __('emails.event_date') }}: {{ $emailData['event_date'] }}
{{ __('emails.tickets_sold') }}: {{ $emailData['tickets_sold'] }}
{{ __('emails.revenue_generated') }}: {{ $emailData['revenue_generated'] }}
{{ __('emails.cancellation_timestamp') }}: {{ $emailData['cancelled_at'] }}
