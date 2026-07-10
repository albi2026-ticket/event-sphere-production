@php
    $heroImage = $event->relationLoaded('images')
        ? ($event->bannerImage()?->publicUrl() ?: $event->banner_image_url)
        : $event->banner_image_url;
    $organizerUrl = \App\Support\AppUrls::frontend('/site/organizer.html');
@endphp

@extends('emails.layouts.tiketa', [
    'title' => __('emails.event_successfully_cancelled'),
    'preheader' => __('emails.event_cancel_recorded'),
    'eyebrow' => __('emails.event_status_update'),
    'heading' => __('emails.event_successfully_cancelled'),
    'intro' => __('emails.event_cancel_recorded'),
])

@section('content')
    @include('emails.components.hero-image', ['src' => $heroImage, 'alt' => $event->title])

    @include('emails.components.message-box', [
        'type' => 'success',
        'title' => __('emails.event_successfully_cancelled'),
        'body' => e(__('emails.event_cancel_recorded')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $organizerUrl, 'label' => __('emails.organizer_dashboard')])->render().'</div>',
    ])

    @include('emails.components.details', [
        'items' => [
            ['label' => __('emails.event_name'), 'value' => e($event->title)],
            ['label' => __('emails.ticket_holders_notified'), 'value' => e($emailData['ticket_holders_notified'])],
            ['label' => __('emails.cancellation_timestamp'), 'value' => e($emailData['cancelled_at'])],
        ],
    ])
@endsection
