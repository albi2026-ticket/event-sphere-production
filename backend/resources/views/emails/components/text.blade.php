@php
    $size = $size ?? 'body';
    $styles = [
        'eyebrow' => 'margin:0 0 8px;font-size:12px;line-height:1.4;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b;',
        'lead' => 'margin:0 0 18px;font-size:17px;line-height:1.65;font-weight:500;color:#334155;',
        'body' => 'margin:0 0 16px;font-size:15px;line-height:1.65;font-weight:400;color:#334155;',
        'muted' => 'margin:0 0 14px;font-size:13px;line-height:1.6;font-weight:400;color:#64748b;',
        'small' => 'margin:0 0 12px;font-size:12px;line-height:1.55;font-weight:400;color:#64748b;',
    ];
@endphp

<p style="{{ $styles[$size] ?? $styles['body'] }}">
    {!! $slot ?? $text ?? '' !!}
</p>
