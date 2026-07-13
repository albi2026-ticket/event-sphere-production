@php
    $firstEvent = $order->items->first()?->event;
    $heroImage = $firstEvent?->relationLoaded('images')
        ? ($firstEvent->bannerImage()?->publicUrl() ?: $firstEvent->banner_image_url)
        : $firstEvent?->banner_image_url;
@endphp

@extends('emails.layouts.tiketa', [
    'title' => __('emails.ticket_order_title', ['order' => $order->order_number]),
    'preheader' => __('emails.tickets_confirmed_copy', ['order' => $order->order_number]),
    'eyebrow' => __('emails.ticket_ready'),
    'heading' => __('emails.tickets_confirmed'),
    'intro' => __('emails.tickets_confirmed_copy', ['order' => $order->order_number]),
])

@section('content')
    @include('emails.components.hero-image', ['src' => $heroImage, 'alt' => $firstEvent?->title ?? __('emails.tickets_confirmed')])

    @include('emails.components.message-box', [
        'type' => 'success',
        'title' => __('emails.ticket_ready'),
        'body' => e(__('emails.ticket_ready_copy')),
    ])

    @include('emails.components.details', [
        'items' => [
            ['label' => __('emails.order_number'), 'value' => e($order->order_number)],
            ['label' => __('emails.purchase_date'), 'value' => e($emailData['purchase_date'])],
            ['label' => __('emails.payment_status'), 'value' => e(ucfirst((string) $order->payment_status))],
            ['label' => __('emails.purchaser'), 'value' => e($emailData['purchaser_name']).'<br><span style="font-weight:500;color:#64748b;">'.e($emailData['purchaser_email']).'</span>'],
        ],
    ])

    @include('emails.components.message-box', [
        'type' => 'info',
        'title' => __('emails.access_tickets'),
        'body' => e(__('emails.access_tickets_copy')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $emailData['my_tickets_url'], 'label' => __('emails.view_tickets')])->render().'</div>',
    ])

    @foreach ($emailData['items'] as $item)
        @include('emails.components.section', [
            'title' => $item['event_name'],
            'body' =>
                '<p style="margin:0 0 16px;color:#475569;line-height:1.6;">'.e($item['event_date']).' '.e($item['event_time']).'<br>'.e($item['timezone_label']).'<br>'.e($item['venue']).'</p>'.
                view('emails.components.details', [
                    'items' => [
                        ['label' => __('emails.ticket_type'), 'value' => e($item['ticket_type'])],
                        ['label' => __('emails.quantity'), 'value' => e($item['quantity'])],
                        ['label' => __('emails.price_per_ticket'), 'value' => e($item['price_per_ticket'])],
                        ['label' => __('emails.service_fee'), 'value' => e($item['service_fee'])],
                        ['label' => __('emails.total_paid'), 'value' => e($item['total_paid'])],
                    ],
                ])->render().
                '<div style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:#64748b;margin:0 0 8px;">'.e(__('emails.attendees')).'</div>'.
                (count($item['attendees'])
                    ? collect($item['attendees'])->map(fn ($attendee) => '<p style="margin:0 0 6px;color:#334155;">'.e($attendee['name']).(! empty($attendee['email']) ? ' <span style="color:#64748b;">('.e($attendee['email']).')</span>' : '').'</p>')->implode('')
                    : '<p style="margin:0;color:#64748b;">'.e(__('emails.no_attendee_details')).'</p>'),
        ])
    @endforeach

    @include('emails.components.details', [
        'items' => [
            ['label' => __('emails.subtotal'), 'value' => e(strtoupper($order->currency).' '.number_format((float) $order->subtotal, 2))],
            ['label' => __('emails.service_fee'), 'value' => e(strtoupper($order->currency).' '.number_format((float) $order->service_fee, 2))],
            ['label' => __('emails.total_paid'), 'value' => '<span style="font-size:18px;">'.e(strtoupper($order->currency).' '.number_format((float) $order->total, 2)).'</span>'],
        ],
    ])

    @if ($emailData['has_qr_tickets'])
        @include('emails.components.qr-section', ['tickets' => $emailData['tickets']])
    @endif

    @include('emails.components.text', ['size' => 'muted', 'text' => __('emails.order_confirmation_footer_html')])
@endsection
