<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ __('emails.admin_event_cancelled_subject') }}</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <h1>{{ __('emails.admin_event_cancelled_subject') }}</h1>
    <p>{{ __('emails.admin_event_cancelled_copy') }}</p>
    <ul>
        <li><strong>{{ __('emails.event_name') }}:</strong> {{ $event->title }}</li>
        <li><strong>{{ __('emails.organizer_name') }}:</strong> {{ $emailData['organizer_name'] }}</li>
        <li><strong>{{ __('emails.event_date') }}:</strong> {{ $emailData['event_date'] }}</li>
        <li><strong>{{ __('emails.tickets_sold') }}:</strong> {{ $emailData['tickets_sold'] }}</li>
        <li><strong>{{ __('emails.revenue_generated') }}:</strong> {{ $emailData['revenue_generated'] }}</li>
        <li><strong>{{ __('emails.cancellation_timestamp') }}:</strong> {{ $emailData['cancelled_at'] }}</li>
    </ul>
</body>
</html>
