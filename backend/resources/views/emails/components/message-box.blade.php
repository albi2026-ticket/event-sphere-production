@php
    $type = $type ?? 'info';
    $palette = [
        'success' => ['bg' => '#ecfdf5', 'border' => '#bbf7d0', 'title' => '#166534', 'text' => '#166534'],
        'warning' => ['bg' => '#fffbeb', 'border' => '#fde68a', 'title' => '#92400e', 'text' => '#92400e'],
        'danger' => ['bg' => '#fef2f2', 'border' => '#fecaca', 'title' => '#991b1b', 'text' => '#991b1b'],
        'info' => ['bg' => '#eff6ff', 'border' => '#bfdbfe', 'title' => '#1e3a8a', 'text' => '#334155'],
    ][$type] ?? ['bg' => '#eff6ff', 'border' => '#bfdbfe', 'title' => '#1e3a8a', 'text' => '#334155'];
@endphp

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:{{ $palette['bg'] }};border:1px solid {{ $palette['border'] }};border-radius:12px;margin:0 0 22px;">
    <tr>
        <td style="padding:18px 20px;">
            @isset($title)
                <div style="font-size:15px;line-height:1.4;font-weight:800;color:{{ $palette['title'] }};margin:0 0 6px;">
                    {{ $title }}
                </div>
            @endisset
            <div style="font-size:14px;line-height:1.65;color:{{ $palette['text'] }};">
                {!! $body ?? '' !!}
            </div>
        </td>
    </tr>
</table>
