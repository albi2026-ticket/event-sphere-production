# Tiketa Email Design System

This folder defines the reusable framework for future Tiketa HTML emails. Existing email content is intentionally unchanged until each email is migrated.

## Foundation

- Layout: `emails.layouts.tiketa`
- Header: `emails.partials.header`
- Footer: `emails.partials.footer`
- Styles: `emails.partials.styles`
- Components: `emails.components.*`
- Transactional helpers:
  - `emails.components.hero-image`
  - `emails.components.details`
  - `emails.components.metric-grid`
  - `emails.components.qr-section`

## Visual System

- Page background: `#f4f6f8`
- Card background: `#ffffff`
- Shell width: `600px`
- Primary text: `#111827`
- Muted text: `#64748b`
- Primary action: `#2563eb`
- Header: `#0f172a`
- Border: `#e6eaf0`
- Radius: `10px`, `12px`, `14px`, `18px`

## Usage

```blade
@extends('emails.layouts.tiketa', [
    'title' => __('emails.example_title'),
    'preheader' => __('emails.example_preheader'),
    'eyebrow' => __('emails.email_notification'),
    'heading' => __('emails.example_heading'),
    'intro' => __('emails.example_intro'),
])

@section('content')
    @include('emails.components.text', ['size' => 'lead', 'text' => __('emails.example_body')])
    @include('emails.components.button', ['url' => $url, 'label' => __('emails.view_tickets')])
    @include('emails.components.hero-image', ['src' => $imageUrl, 'alt' => $eventTitle])
    @include('emails.components.details', [
        'items' => [
            ['label' => __('emails.date'), 'value' => e($date)],
            ['label' => __('emails.venue'), 'value' => e($venue)],
        ],
    ])
    @include('emails.components.divider')
    @include('emails.components.message-box', [
        'type' => 'info',
        'title' => __('emails.need_help'),
        'body' => e(__('emails.email_footer_help')),
    ])
@endsection
```

Use table-based layout and inline styles for broad email client support. Keep copy and email-specific content inside each email view; keep visual decisions in these shared partials.
