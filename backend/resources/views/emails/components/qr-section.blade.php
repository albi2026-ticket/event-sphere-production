<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0f172a;border-radius:16px;margin:0 0 24px;">
    <tr>
        <td style="padding:22px;color:#ffffff;">
            <div style="font-size:18px;line-height:1.35;font-weight:850;color:#ffffff;margin:0 0 8px;">
                {{ $title ?? __('emails.qr_ticket_links') }}
            </div>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                {{ $copy ?? __('emails.qr_ticket_copy') }}
            </p>
            @foreach ($tickets ?? [] as $ticket)
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#182235;border:1px solid #26344c;border-radius:12px;margin:0 0 10px;">
                    <tr>
                        <td style="padding:14px 16px;">
                            <div style="font-size:13px;line-height:1.5;color:#e2e8f0;font-weight:800;">
                                {{ $ticket['code'] ?? __('emails.ticket') }}
                            </div>
                            <div style="font-size:13px;line-height:1.5;color:#94a3b8;margin:2px 0 10px;">
                                {{ $ticket['attendee_name'] ?? '' }}
                            </div>
                            @if (! empty($ticket['download_url']))
                                <a href="{{ $ticket['download_url'] }}" style="color:#93c5fd;text-decoration:none;font-size:13px;font-weight:800;">{{ __('emails.download_view_ticket') }}</a>
                            @endif
                            @if (! empty($ticket['qr_url']))
                                <span style="color:#475569;margin:0 8px;">|</span>
                                <a href="{{ $ticket['qr_url'] }}" style="color:#93c5fd;text-decoration:none;font-size:13px;font-weight:800;">{{ __('emails.view_qr_code') }}</a>
                            @endif
                        </td>
                    </tr>
                </table>
            @endforeach
        </td>
    </tr>
</table>
