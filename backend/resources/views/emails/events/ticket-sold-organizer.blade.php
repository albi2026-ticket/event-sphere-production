<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>New Ticket Sold</title>
    <style>
        @media only screen and (max-width: 640px) {
            .shell { width: 100% !important; }
            .content { padding: 24px !important; }
            .grid { display: block !important; }
            .grid-cell { display: block !important; width: 100% !important; padding-right: 0 !important; padding-left: 0 !important; }
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
                            <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#93c5fd;">Tiketa</div>
                            <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;">New ticket sold</h1>
                            <p style="margin:10px 0 0;color:#d1d5db;">{{ $emailData['event_name'] }} received a new paid ticket order.</p>
                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="padding:32px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                                <tr class="grid">
                                    <td class="grid-cell" width="50%" style="padding:0 12px 12px 0;vertical-align:top;">
                                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Event</div>
                                        <div style="font-size:18px;font-weight:700;margin-top:4px;">{{ $emailData['event_name'] }}</div>
                                    </td>
                                    <td class="grid-cell" width="50%" style="padding:0 0 12px 12px;vertical-align:top;">
                                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Event date</div>
                                        <div style="font-size:15px;margin-top:4px;">{{ $emailData['event_date'] }}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding:10px 0 0;vertical-align:top;">
                                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Venue</div>
                                        <div style="font-size:15px;margin-top:4px;color:#334155;">{{ $emailData['venue'] }}</div>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:24px;">
                                <tr>
                                    <td style="padding:18px;">
                                        <div style="font-weight:700;color:#1e3a8a;">Review the order</div>
                                        <p style="margin:8px 0 16px;color:#334155;line-height:1.5;">Open your organizer dashboard to review recent paid orders and attendee details.</p>
                                        <a class="button" href="{{ $emailData['view_orders_url'] }}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">View Orders</a>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                                <tr class="grid">
                                    <td class="grid-cell" width="33.33%" style="padding:0 8px 10px 0;vertical-align:top;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                                            <tr>
                                                <td style="padding:16px;">
                                                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Tickets Sold</div>
                                                    <div style="font-size:26px;font-weight:800;margin-top:6px;color:#0f172a;">{{ number_format($emailData['tickets_sold']) }}</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td class="grid-cell" width="33.33%" style="padding:0 4px 10px;vertical-align:top;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                                            <tr>
                                                <td style="padding:16px;">
                                                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Tickets Remaining</div>
                                                    <div style="font-size:26px;font-weight:800;margin-top:6px;color:#0f172a;">{{ number_format($emailData['tickets_remaining']) }}</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td class="grid-cell" width="33.33%" style="padding:0 0 10px 8px;vertical-align:top;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                                            <tr>
                                                <td style="padding:16px;">
                                                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Gross Revenue</div>
                                                    <div style="font-size:24px;font-weight:800;margin-top:6px;color:#0f172a;">{{ $emailData['gross_revenue'] }}</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                                <tr class="grid">
                                    <td class="grid-cell" width="50%" style="padding:0 12px 12px 0;vertical-align:top;">
                                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Buyer name</div>
                                        <div style="font-size:15px;margin-top:4px;">{{ $emailData['buyer_name'] }}</div>
                                    </td>
                                    <td class="grid-cell" width="50%" style="padding:0 0 12px 12px;vertical-align:top;">
                                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Buyer email</div>
                                        <div style="font-size:15px;margin-top:4px;">{{ $emailData['buyer_email'] }}</div>
                                    </td>
                                </tr>
                                <tr class="grid">
                                    <td class="grid-cell" width="50%" style="padding:0 12px 0 0;vertical-align:top;">
                                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Order ID</div>
                                        <div style="font-size:15px;margin-top:4px;">{{ $emailData['order_id'] }}</div>
                                    </td>
                                    <td class="grid-cell" width="50%" style="padding:0 0 0 12px;vertical-align:top;">
                                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Purchase date</div>
                                        <div style="font-size:15px;margin-top:4px;">{{ $emailData['purchase_date'] }}</div>
                                    </td>
                                </tr>
                            </table>

                            <h2 style="font-size:18px;margin:0 0 12px;color:#0f172a;">Ticket Summary</h2>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:24px;">
                                <tr>
                                    <th align="left" style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;">Ticket</th>
                                    <th align="right" style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;">Qty</th>
                                    <th align="right" style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;">Price</th>
                                    <th align="right" style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;">Subtotal</th>
                                </tr>
                                @foreach ($emailData['tickets'] as $ticket)
                                    <tr>
                                        <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-weight:700;">{{ $ticket['name'] }}</td>
                                        <td align="right" style="padding:12px 0;border-bottom:1px solid #f1f5f9;">{{ $ticket['quantity'] }}</td>
                                        <td align="right" style="padding:12px 0;border-bottom:1px solid #f1f5f9;">{{ $ticket['price'] }}</td>
                                        <td align="right" style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-weight:700;">{{ $ticket['subtotal'] }}</td>
                                    </tr>
                                @endforeach
                                <tr>
                                    <td colspan="3" style="padding:14px 0 0;font-size:17px;font-weight:700;">Order Total</td>
                                    <td align="right" style="padding:14px 0 0;font-size:17px;font-weight:700;">{{ $emailData['order_total'] }}</td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111827;border-radius:10px;margin:6px 0 24px;">
                                <tr>
                                    <td style="padding:20px;color:#ffffff;">
                                        <div style="font-size:17px;font-weight:800;">View full event analytics</div>
                                        <p style="margin:8px 0 16px;color:#cbd5e1;line-height:1.5;">Track sales, revenue, inventory, and attendee activity from your organizer dashboard.</p>
                                        <a class="button" href="{{ $emailData['view_analytics_url'] }}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">Go to Organizer Dashboard</a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:26px 0 0;color:#64748b;font-size:13px;line-height:1.5;">This organizer notification was sent after payment was completed and tickets were issued successfully. Gross revenue reflects paid, non-refunded orders recorded for this event.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
