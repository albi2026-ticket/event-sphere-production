<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
    <tr>
        @foreach ($items as $item)
            <td class="tk-stack" width="{{ floor(100 / max(count($items), 1)) }}%" style="padding:0 {{ $loop->last ? '0' : '8px' }} 10px {{ $loop->first ? '0' : '8px' }};vertical-align:top;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e6eaf0;border-radius:14px;">
                    <tr>
                        <td style="padding:18px;">
                            <div style="font-size:11px;line-height:1.4;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:#64748b;">
                                {{ $item['label'] }}
                            </div>
                            <div style="font-size:24px;line-height:1.2;font-weight:850;color:#0f172a;margin-top:7px;">
                                {{ $item['value'] }}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        @endforeach
    </tr>
</table>
