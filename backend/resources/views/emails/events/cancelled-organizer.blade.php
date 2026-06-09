<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Event Successfully Cancelled</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <h1>Event Successfully Cancelled</h1>
    <p>Your event cancellation has been recorded.</p>
    <ul>
        <li><strong>Event Name:</strong> {{ $event->title }}</li>
        <li><strong>Ticket Holders Notified:</strong> {{ $emailData['ticket_holders_notified'] }}</li>
        <li><strong>Cancellation Timestamp:</strong> {{ $emailData['cancelled_at'] }}</li>
    </ul>
</body>
</html>
