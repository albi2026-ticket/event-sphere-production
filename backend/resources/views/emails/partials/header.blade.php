<tr>
    <td class="tk-header" style="padding:32px 36px 30px;background:#0f172a;color:#ffffff;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
                <td style="vertical-align:middle;">
                    <div style="font-size:22px;line-height:1;font-weight:800;letter-spacing:0;color:#ffffff;">
                        Tiketa
                    </div>
                </td>
                <td align="right" style="vertical-align:middle;">
                    <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#1e293b;color:#bfdbfe;font-size:12px;line-height:1;font-weight:700;">
                        {{ $eyebrow ?? __('emails.email_notification') }}
                    </div>
                </td>
            </tr>
        </table>

        @isset($heading)
            <h1 style="margin:26px 0 0;font-size:30px;line-height:1.2;font-weight:800;letter-spacing:0;color:#ffffff;">
                {{ $heading }}
            </h1>
        @endisset

        @isset($intro)
            <p style="margin:12px 0 0;font-size:16px;line-height:1.65;color:#dbeafe;">
                {{ $intro }}
            </p>
        @endisset
    </td>
</tr>
