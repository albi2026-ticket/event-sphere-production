<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e6eaf0;border-radius:14px;background:#ffffff;margin:0 0 22px;">
    <tr>
        <td style="padding:22px;">
            @isset($title)
                <h2 style="margin:0 0 12px;font-size:18px;line-height:1.35;font-weight:800;color:#0f172a;letter-spacing:0;">
                    {{ $title }}
                </h2>
            @endisset
            <div style="font-size:15px;line-height:1.65;color:#334155;">
                {!! $body ?? '' !!}
            </div>
        </td>
    </tr>
</table>
