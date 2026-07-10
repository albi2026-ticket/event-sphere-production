<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <title>{{ $title ?? config('app.name', 'Tiketa') }}</title>
    @include('emails.partials.styles')
</head>
<body style="margin:0;padding:0;background:#f4f6f8;color:#111827;font-family:Inter,'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    @isset($preheader)
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
            {{ $preheader }}
        </div>
    @endisset

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f6f8;">
        <tr>
            <td align="center" style="padding:32px 12px;">
                <table role="presentation" class="tk-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;border-collapse:separate;background:#ffffff;border:1px solid #e6eaf0;border-radius:18px;overflow:hidden;box-shadow:0 18px 42px rgba(15,23,42,0.08);">
                    @include('emails.partials.header', [
                        'eyebrow' => $eyebrow ?? null,
                        'heading' => $heading ?? null,
                        'intro' => $intro ?? null,
                    ])

                    <tr>
                        <td class="tk-content" style="padding:34px 36px 10px;">
                            @yield('content')
                        </td>
                    </tr>

                    @include('emails.partials.footer')
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
