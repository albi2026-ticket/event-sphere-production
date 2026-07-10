@php
    $variant = $variant ?? 'primary';
    $isSecondary = $variant === 'secondary';
    $background = $isSecondary ? '#f8fafc' : '#2563eb';
    $border = $isSecondary ? '#dbe3ef' : '#2563eb';
    $color = $isSecondary ? '#0f172a' : '#ffffff';
@endphp

<a href="{{ $url }}" class="{{ $isSecondary ? 'tk-button-secondary' : 'tk-button' }}" style="display:inline-block;background:{{ $background }};border:1px solid {{ $border }};color:{{ $color }};text-decoration:none;font-size:15px;line-height:1.2;font-weight:800;padding:14px 20px;border-radius:10px;box-shadow:{{ $isSecondary ? 'none' : '0 10px 18px rgba(37,99,235,0.22)' }};">
    {{ $label }}
</a>
