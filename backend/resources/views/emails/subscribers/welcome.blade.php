<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to Tiketa updates</title>
</head>
<body style="margin:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033">
  <div style="max-width:640px;margin:0 auto;padding:32px 18px">
    <div style="background:#111827;color:#fff;border-radius:18px 18px 0 0;padding:26px 28px">
      <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#c7d2fe">Tiketa</div>
      <h1 style="margin:8px 0 0;font-size:28px;line-height:1.2">You are subscribed</h1>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 18px 18px;padding:28px">
      <p style="font-size:16px;line-height:1.6;margin:0 0 18px">Thanks for joining Tiketa updates. We will send occasional highlights based on your subscription source: {{ $subscription->source === 'restaurants' ? 'restaurants, bars, lounges, and reservation experiences' : 'events, tickets, festivals, concerts, and sports' }}.</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 22px">Expect curated recommendations, new launches, and platform announcements. No newsletter campaigns are active yet, so we will keep it quiet until there is something useful to share.</p>
      <a href="{{ $unsubscribeUrl }}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;border-radius:999px;padding:12px 18px;font-weight:700">Manage subscription</a>
      <p style="font-size:13px;line-height:1.5;color:#6b7280;margin:24px 0 0">You can unsubscribe at any time. This link will mark your subscription as unsubscribed without deleting your record.</p>
    </div>
  </div>
</body>
</html>
