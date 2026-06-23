<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.55">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f4f6fb;margin:0;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 16px 40px rgba(17,24,39,0.08)">
          <tr>
            <td style="padding:30px 32px 22px;background:#111827">
              <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d4a75a;margin-bottom:10px">Event Sphere Reservations</div>
              <h1 style="font-size:28px;line-height:1.2;margin:0;color:#ffffff;font-weight:700">Reservation Cancelled by Guest</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px 8px">
              <p style="margin:0 0 20px;font-size:16px;color:#374151">A guest has cancelled a reservation for <strong style="color:#111827">{{ $reservation->venue->name }}</strong>.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;margin:0 0 24px">
                <tr><td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280"><strong style="display:block;color:#111827;font-size:15px">Guest Name:</strong> {{ $reservation->guest_name }}</td></tr>
                <tr><td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280"><strong style="display:block;color:#111827;font-size:15px">Phone:</strong> {{ $reservation->phone ?: 'Not provided' }}</td></tr>
                <tr><td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280"><strong style="display:block;color:#111827;font-size:15px">Reservation Date:</strong> {{ $reservation->reservation_date->format('M j, Y') }}</td></tr>
                <tr><td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280"><strong style="display:block;color:#111827;font-size:15px">Reservation Time:</strong> {{ $reservation->reservation_time }}</td></tr>
                <tr><td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280"><strong style="display:block;color:#111827;font-size:15px">Party Size:</strong> {{ $reservation->party_size }}</td></tr>
                <tr><td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280"><strong style="display:block;color:#111827;font-size:15px">Venue Name:</strong> {{ $reservation->venue->name }}</td></tr>
                <tr><td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280"><strong style="display:block;color:#111827;font-size:15px">Cancellation Reason:</strong> {{ $reservation->cancellation_reason ?: 'No reason provided.' }}</td></tr>
                <tr><td style="padding:14px 18px;font-size:14px;color:#6b7280"><strong style="display:block;color:#111827;font-size:15px">Cancellation Timestamp:</strong> {{ $reservation->cancelled_at?->format('M j, Y g:i A') }}</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
