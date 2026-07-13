@php
    $heroImage = $event->relationLoaded('images')
        ? ($event->bannerImage()?->publicUrl() ?: $event->banner_image_url)
        : $event->banner_image_url;
    $ticketsUrl = \App\Support\AppUrls::frontend('/site/dashboard.html#tickets');
@endphp

@extends('emails.layouts.tiketa', [
    'title' => __('emails.event_cancelled').' - '.$event->title,
    'preheader' => __('emails.user_event_cancelled_copy', ['event' => $event->title]),
    'eyebrow' => __('emails.event_status_update'),
    'heading' => __('emails.event_cancelled'),
    'intro' => __('emails.user_event_cancelled_copy', ['event' => $event->title]),
])

@section('content')
    @include('emails.components.hero-image', ['src' => $heroImage, 'alt' => $event->title])

    @include('emails.components.message-box', [
        'type' => 'warning',
        'title' => __('emails.important_update'),
        'body' => e(__('emails.ticket_no_longer_valid')).'<br>'.e(__('emails.refund_followup')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $ticketsUrl, 'label' => __('emails.view_tickets'), 'variant' => 'secondary'])->render().'</div>',
    ])

    @include('emails.components.details', [
        'items' => [
            ['label' => __('emails.event_name'), 'value' => e($event->title)],
            ['label' => __('emails.date'), 'value' => e($emailData['event_date'])],
            ['label' => __('emails.location'), 'value' => e($emailData['location'])],
            ['label' => __('emails.order_number'), 'value' => e($order->order_number)],
        ],
    ])

    @include('emails.components.text', ['size' => 'body', 'text' => __('emails.apology')])
    @include('emails.components.text', ['size' => 'muted', 'text' => __('emails.tiketa_team')])
@endsection
