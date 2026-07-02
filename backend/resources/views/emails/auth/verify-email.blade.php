<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ __('emails.verify_email_title') }}</title>
</head>
<body style="margin:0;background:#f3f6fb;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:28px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="width:620px;max-width:100%;background:#ffffff;border:1px solid #dbe3ef;border-radius:12px;overflow:hidden;">
                    <tr>
                        <td style="background:#111827;color:#ffffff;padding:28px 32px;">
                            <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#93c5fd;">Tiketa</div>
                            <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;">{{ __('emails.verify_email_heading') }}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">{{ __('emails.verify_email_welcome', ['name' => $user->name ?: __('emails.there')]) }}</p>
                            <p style="margin:0 0 22px;color:#475569;line-height:1.6;">{{ __('emails.verify_email_copy') }}</p>
                            <a href="{{ $verificationUrl }}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">{{ __('emails.verify_email_button') }}</a>
                            <p style="margin:22px 0 0;color:#64748b;font-size:13px;line-height:1.5;">{{ __('emails.verify_email_expiry_html', ['minutes' => $expirationMinutes]) }}</p>
                            <p style="margin:18px 0 0;color:#64748b;font-size:12px;line-height:1.5;">{{ __('emails.fallback_link') }}<br><a href="{{ $verificationUrl }}" style="color:#2563eb;">{{ $verificationUrl }}</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
