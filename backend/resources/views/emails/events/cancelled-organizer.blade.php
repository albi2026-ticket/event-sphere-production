<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ __('emails.event_successfully_cancelled') }}</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <h1>{{ __('emails.event_successfully_cancelled') }}</h1>
    <p>{{ __('emails.event_cancel_recorded') }}</p>
    <ul>
        <li><strong>{{ __('emails.event_name') }}:</strong> {{ $event->title }}</li>
        <li><strong>{{ __('emails.ticket_holders_notified') }}:</strong> {{ $emailData['ticket_holders_notified'] }}</li>
        <li><strong>{{ __('emails.cancellation_timestamp') }}:</strong> {{ $emailData['cancelled_at'] }}</li>
    </ul>
</body>
</html>
