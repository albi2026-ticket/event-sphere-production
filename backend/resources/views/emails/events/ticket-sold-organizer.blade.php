@php
    $heroImage = $event->relationLoaded('images')
        ? ($event->bannerImage()?->publicUrl() ?: $event->banner_image_url)
        : $event->banner_image_url;
@endphp

@extends('emails.layouts.tiketa', [
    'title' => __('emails.new_ticket_sold'),
    'preheader' => __('emails.organizer_sale_copy', ['event' => $emailData['event_name']]),
    'eyebrow' => __('emails.new_order'),
    'heading' => __('emails.new_ticket_sold'),
    'intro' => __('emails.organizer_sale_copy', ['event' => $emailData['event_name']]),
])

@section('content')
    @include('emails.components.hero-image', ['src' => $heroImage, 'alt' => $event->title])

    @include('emails.components.details', [
        'items' => [
            ['label' => __('emails.event'), 'value' => e($emailData['event_name'])],
            ['label' => __('emails.event_date'), 'value' => e($emailData['event_date'])],
            ['label' => __('emails.venue'), 'value' => e($emailData['venue'])],
            ['label' => __('emails.order_id'), 'value' => e($emailData['order_id'])],
        ],
    ])

    @include('emails.components.message-box', [
        'type' => 'success',
        'title' => __('emails.review_order'),
        'body' => e(__('emails.review_order_copy')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $emailData['view_orders_url'], 'label' => __('emails.view_orders')])->render().'</div>',
    ])

    @include('emails.components.metric-grid', [
        'items' => [
            ['label' => __('emails.tickets_sold'), 'value' => number_format($emailData['tickets_sold'])],
            ['label' => __('emails.tickets_remaining'), 'value' => number_format($emailData['tickets_remaining'])],
            ['label' => __('emails.gross_revenue'), 'value' => $emailData['gross_revenue']],
        ],
    ])

    @include('emails.components.details', [
        'items' => [
            ['label' => __('emails.buyer_name'), 'value' => e($emailData['buyer_name'])],
            ['label' => __('emails.buyer_email'), 'value' => e($emailData['buyer_email'])],
            ['label' => __('emails.purchase_date'), 'value' => e($emailData['purchase_date'])],
        ],
    ])

    @include('emails.components.section', [
        'title' => __('emails.ticket_summary'),
        'body' =>
            '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">'.
            '<tr><th align="left" style="padding:10px 0;border-bottom:1px solid #e6eaf0;color:#64748b;font-size:12px;text-transform:uppercase;">'.e(__('emails.ticket')).'</th><th align="right" style="padding:10px 0;border-bottom:1px solid #e6eaf0;color:#64748b;font-size:12px;text-transform:uppercase;">'.e(__('emails.qty')).'</th><th align="right" style="padding:10px 0;border-bottom:1px solid #e6eaf0;color:#64748b;font-size:12px;text-transform:uppercase;">'.e(__('emails.subtotal')).'</th></tr>'.
            collect($emailData['tickets'])->map(fn ($ticket) => '<tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-weight:700;">'.e($ticket['name']).'<br><span style="font-size:13px;font-weight:500;color:#64748b;">'.e($ticket['price']).'</span></td><td align="right" style="padding:12px 0;border-bottom:1px solid #f1f5f9;">'.e($ticket['quantity']).'</td><td align="right" style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-weight:800;">'.e($ticket['subtotal']).'</td></tr>')->implode('').
            '<tr><td colspan="2" style="padding:16px 0 0;font-size:17px;font-weight:800;">'.e(__('emails.order_total')).'</td><td align="right" style="padding:16px 0 0;font-size:17px;font-weight:800;">'.e($emailData['order_total']).'</td></tr>'.
            '</table>',
    ])

    @include('emails.components.message-box', [
        'type' => 'info',
        'title' => __('emails.view_analytics'),
        'body' => e(__('emails.track_analytics_copy')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $emailData['view_analytics_url'], 'label' => __('emails.organizer_dashboard')])->render().'</div>',
    ])

    @include('emails.components.text', ['size' => 'muted', 'text' => __('emails.organizer_notification_footer')])
@endsection
