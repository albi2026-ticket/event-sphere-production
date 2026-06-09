<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Event Cancelled - {{ $event->title }}</title>
</head>
<body style="margin:0;background:#f3f6fb;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:28px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dbe3ef;">
                    <tr>
                        <td style="background:#111827;padding:28px 32px;color:#ffffff;">
                            <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#93c5fd;">Event Sphere</div>
                            <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;">Event Cancelled</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px;color:#334155;line-height:1.6;">We regret to inform you that the event "{{ $event->title }}" has been cancelled.</p>
                            <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Your ticket(s) are no longer valid for entry.</p>
                            <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Our team will contact you regarding the refund process or any next steps that apply.</p>
                            <p style="margin:0 0 24px;color:#334155;line-height:1.6;">We apologize for the inconvenience and appreciate your understanding.</p>

                            <h2 style="font-size:18px;margin:0 0 12px;">Event Details</h2>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px;">
                                <tr><td style="padding:10px 14px;color:#64748b;">Event Name</td><td style="padding:10px 14px;font-weight:700;">{{ $event->title }}</td></tr>
                                <tr><td style="padding:10px 14px;color:#64748b;">Date</td><td style="padding:10px 14px;">{{ $emailData['event_date'] }}</td></tr>
                                <tr><td style="padding:10px 14px;color:#64748b;">Location</td><td style="padding:10px 14px;">{{ $emailData['location'] }}</td></tr>
                                <tr><td style="padding:10px 14px;color:#64748b;">Order Number</td><td style="padding:10px 14px;">{{ $order->order_number }}</td></tr>
                            </table>

                            <p style="margin:0;color:#334155;line-height:1.6;">Event Sphere Team</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
