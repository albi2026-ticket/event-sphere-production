<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Event Cancelled - Admin Notification</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <h1>Event Cancelled - Admin Notification</h1>
    <p>An event has been cancelled and may require refund review.</p>
    <ul>
        <li><strong>Event Name:</strong> {{ $event->title }}</li>
        <li><strong>Organizer Name:</strong> {{ $emailData['organizer_name'] }}</li>
        <li><strong>Event Date:</strong> {{ $emailData['event_date'] }}</li>
        <li><strong>Tickets Sold:</strong> {{ $emailData['tickets_sold'] }}</li>
        <li><strong>Revenue Generated:</strong> {{ $emailData['revenue_generated'] }}</li>
        <li><strong>Cancellation Timestamp:</strong> {{ $emailData['cancelled_at'] }}</li>
    </ul>
</body>
</html>
