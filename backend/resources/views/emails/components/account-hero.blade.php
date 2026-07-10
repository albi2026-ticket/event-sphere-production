@php
    $tone = $tone ?? 'info';
    $colors = [
        'success' => ['bg' => '#ecfdf5', 'border' => '#bbf7d0', 'text' => '#166534', 'mark' => '#16a34a'],
        'warning' => ['bg' => '#fffbeb', 'border' => '#fde68a', 'text' => '#92400e', 'mark' => '#d97706'],
        'info' => ['bg' => '#eff6ff', 'border' => '#bfdbfe', 'text' => '#1e3a8a', 'mark' => '#2563eb'],
    ][$tone] ?? ['bg' => '#eff6ff', 'border' => '#bfdbfe', 'text' => '#1e3a8a', 'mark' => '#2563eb'];
@endphp

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
    <tr>
        <td style="padding:22px;border:1px solid {{ $colors['border'] }};border-radius:16px;background:{{ $colors['bg'] }};">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td width="54" style="vertical-align:top;">
                        <div style="width:46px;height:46px;border-radius:14px;background:#ffffff;border:1px solid {{ $colors['border'] }};text-align:center;line-height:46px;font-weight:900;font-size:18px;color:{{ $colors['mark'] }};">
                            {{ $mark ?? 'T' }}
                        </div>
                    </td>
                    <td style="vertical-align:top;">
                        <div style="font-size:16px;line-height:1.45;font-weight:850;color:{{ $colors['text'] }};margin:0 0 6px;">
                            {{ $title }}
                        </div>
                        <div style="font-size:14px;line-height:1.65;color:#334155;">
                            {!! $copy !!}
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
