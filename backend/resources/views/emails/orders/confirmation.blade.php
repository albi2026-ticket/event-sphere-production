<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Order {{ $order->order_number }}</title>
    <style>
        @media only screen and (max-width: 640px) {
            .shell { width: 100% !important; }
            .content { padding: 24px !important; }
            .grid { display: block !important; }
            .grid-cell { display: block !important; width: 100% !important; padding-right: 0 !important; }
            .button { display: block !important; text-align: center !important; }
        }
    </style>
</head>
<body style="margin:0;background:#f3f6fb;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:28px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" class="shell" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dbe3ef;">
                    <tr>
                        <td style="background:#111827;padding:28px 32px;color:#ffffff;">
                            <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#93c5fd;">Event Sphere</div>
                            <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;">Your tickets are confirmed</h1>
                            <p style="margin:10px 0 0;color:#d1d5db;">Order {{ $order->order_number }} is paid and ready in your ticket dashboard.</p>
                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="padding:32px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                                <tr class="grid">
                                    <td class="grid-cell" width="50%" style="padding:0 12px 12px 0;vertical-align:top;">
                                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Order</div>
                                        <div style="font-size:18px;font-weight:700;margin-top:4px;">{{ $order->order_number }}</div>
                                    </td>
                                    <td class="grid-cell" width="50%" style="padding:0 0 12px 12px;vertical-align:top;">
                                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Payment status</div>
                                        <div style="font-size:18px;font-weight:700;margin-top:4px;text-transform:capitalize;">{{ $order->payment_status }}</div>
                                    </td>
                                </tr>
                                <tr class="grid">
                                    <td class="grid-cell" width="50%" style="padding:0 12px 0 0;vertical-align:top;">
                                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Purchase date</div>
                                        <div style="font-size:15px;margin-top:4px;">{{ $emailData['purchase_date'] }}</div>
                                    </td>
                                    <td class="grid-cell" width="50%" style="padding:0 0 0 12px;vertical-align:top;">
                                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Purchaser</div>
                                        <div style="font-size:15px;margin-top:4px;">{{ $emailData['purchaser_name'] }}<br><span style="color:#64748b;">{{ $emailData['purchaser_email'] }}</span></div>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:24px;">
                                <tr>
                                    <td style="padding:18px;">
                                        <div style="font-weight:700;color:#1e3a8a;">Access your tickets</div>
                                        <p style="margin:8px 0 16px;color:#334155;line-height:1.5;">Your tickets and QR codes are available in your Event Sphere dashboard.</p>
                                        <a class="button" href="{{ $emailData['my_tickets_url'] }}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">View Tickets</a>
                                        <p style="margin:12px 0 0;font-size:13px;color:#64748b;">My Tickets: <a href="{{ $emailData['my_tickets_url'] }}" style="color:#2563eb;">{{ $emailData['my_tickets_url'] }}</a></p>
                                    </td>
                                </tr>
                            </table>

                            @foreach ($emailData['items'] as $item)
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:18px;">
                                    <tr>
                                        <td style="padding:20px;">
                                            <h2 style="font-size:20px;line-height:1.3;margin:0 0 8px;color:#0f172a;">{{ $item['event_name'] }}</h2>
                                            <p style="margin:0 0 16px;color:#475569;line-height:1.5;">{{ $item['event_date'] }} at {{ $item['event_time'] }}<br>{{ $item['timezone_label'] }}<br>{{ $item['venue'] }}</p>

                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                                                <tr>
                                                    <td style="padding:8px 0;color:#64748b;">Ticket type</td>
                                                    <td align="right" style="padding:8px 0;font-weight:700;">{{ $item['ticket_type'] }}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:8px 0;color:#64748b;">Quantity</td>
                                                    <td align="right" style="padding:8px 0;font-weight:700;">{{ $item['quantity'] }}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:8px 0;color:#64748b;">Price per ticket</td>
                                                    <td align="right" style="padding:8px 0;font-weight:700;">{{ $item['price_per_ticket'] }}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:8px 0;color:#64748b;">Service fee</td>
                                                    <td align="right" style="padding:8px 0;font-weight:700;">{{ $item['service_fee'] }}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:12px 0 0;border-top:1px solid #e2e8f0;font-size:16px;font-weight:700;">Total paid</td>
                                                    <td align="right" style="padding:12px 0 0;border-top:1px solid #e2e8f0;font-size:16px;font-weight:700;">{{ $item['total_paid'] }}</td>
                                                </tr>
                                            </table>

                                            <h3 style="font-size:14px;margin:20px 0 8px;color:#0f172a;">Attendees</h3>
                                            @forelse ($item['attendees'] as $attendee)
                                                <p style="margin:0 0 6px;color:#334155;">{{ $attendee['name'] }}@if (! empty($attendee['email'])) <span style="color:#64748b;">({{ $attendee['email'] }})</span>@endif</p>
                                            @empty
                                                <p style="margin:0;color:#64748b;">No attendee details were provided.</p>
                                            @endforelse
                                        </td>
                                    </tr>
                                </table>
                            @endforeach

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 24px;">
                                <tr>
                                    <td style="padding:6px 0;color:#64748b;">Subtotal</td>
                                    <td align="right" style="padding:6px 0;">{{ strtoupper($order->currency) }} {{ number_format((float) $order->subtotal, 2) }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0;color:#64748b;">Service fee</td>
                                    <td align="right" style="padding:6px 0;">{{ strtoupper($order->currency) }} {{ number_format((float) $order->service_fee, 2) }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0 0;border-top:1px solid #e2e8f0;font-size:18px;font-weight:700;">Total paid</td>
                                    <td align="right" style="padding:10px 0 0;border-top:1px solid #e2e8f0;font-size:18px;font-weight:700;">{{ strtoupper($order->currency) }} {{ number_format((float) $order->total, 2) }}</td>
                                </tr>
                            </table>

                            @if ($emailData['has_qr_tickets'])
                                <h2 style="font-size:18px;margin:0 0 10px;">QR ticket links</h2>
                                <p style="margin:0 0 12px;color:#475569;line-height:1.5;">Each issued ticket includes a QR code for check-in. Open or download tickets from your dashboard before arrival.</p>
                                @foreach ($emailData['tickets'] as $ticket)
                                    <p style="margin:0 0 10px;color:#334155;"><strong>{{ $ticket['code'] }}</strong> - {{ $ticket['attendee_name'] }}<br><a href="{{ $ticket['download_url'] }}" style="color:#2563eb;">Download/View ticket</a> · <a href="{{ $ticket['qr_url'] }}" style="color:#2563eb;">View QR code</a></p>
                                @endforeach
                            @endif

                            <p style="margin:26px 0 0;color:#64748b;font-size:13px;line-height:1.5;">This confirmation was sent by Event Sphere after successful payment. Keep it for your records and bring your QR ticket to event check-in.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
