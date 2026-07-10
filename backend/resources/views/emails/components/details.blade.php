<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e6eaf0;border-radius:14px;background:#ffffff;margin:0 0 24px;overflow:hidden;">
    @foreach ($items as $item)
        @continue(empty($item['value']) && ($item['value'] ?? null) !== 0)
        <tr>
            <td style="padding:14px 18px;{{ $loop->last ? '' : 'border-bottom:1px solid #eef2f7;' }}">
                <div style="font-size:11px;line-height:1.4;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:#64748b;margin:0 0 4px;">
                    {{ $item['label'] }}
                </div>
                <div style="font-size:15px;line-height:1.55;font-weight:700;color:#0f172a;">
                    {!! $item['value'] !!}
                </div>
            </td>
        </tr>
    @endforeach
</table>
