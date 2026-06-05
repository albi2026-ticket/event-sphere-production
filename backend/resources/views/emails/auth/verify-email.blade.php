<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify your Event Sphere email</title>
</head>
<body style="margin:0;background:#f3f6fb;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:28px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="width:620px;max-width:100%;background:#ffffff;border:1px solid #dbe3ef;border-radius:12px;overflow:hidden;">
                    <tr>
                        <td style="background:#111827;color:#ffffff;padding:28px 32px;">
                            <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#93c5fd;">Event Sphere</div>
                            <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;">Verify your email address</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Welcome to Event Sphere, {{ $user->name ?: 'there' }}.</p>
                            <p style="margin:0 0 22px;color:#475569;line-height:1.6;">Please verify your email address to secure your account and keep ticket, order, and organizer notifications connected to the right inbox.</p>
                            <a href="{{ $verificationUrl }}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">Verify Email</a>
                            <p style="margin:22px 0 0;color:#64748b;font-size:13px;line-height:1.5;">This verification link expires in {{ $expirationMinutes }} minutes. If you did not create an Event Sphere account, you can ignore this email.</p>
                            <p style="margin:18px 0 0;color:#64748b;font-size:12px;line-height:1.5;">If the button does not work, open this link:<br><a href="{{ $verificationUrl }}" style="color:#2563eb;">{{ $verificationUrl }}</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
