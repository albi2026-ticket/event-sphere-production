@php
    $heroImage = $event->relationLoaded('images')
        ? ($event->bannerImage()?->publicUrl() ?: $event->banner_image_url)
        : $event->banner_image_url;
    $adminUrl = \App\Support\AppUrls::frontend('/site/admin.html');
@endphp

@extends('emails.layouts.tiketa', [
    'title' => __('emails.admin_event_cancelled_subject'),
    'preheader' => __('emails.admin_event_cancelled_copy'),
    'eyebrow' => __('emails.event_status_update'),
    'heading' => __('emails.admin_event_cancelled_subject'),
    'intro' => __('emails.admin_event_cancelled_copy'),
])

@section('content')
    @include('emails.components.hero-image', ['src' => $heroImage, 'alt' => $event->title])

    @include('emails.components.message-box', [
        'type' => 'warning',
        'title' => __('emails.approval_required'),
        'body' => e(__('emails.admin_event_cancelled_copy')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $adminUrl, 'label' => __('emails.view_dashboard'), 'variant' => 'secondary'])->render().'</div>',
    ])

    @include('emails.components.details', [
        'items' => [
            ['label' => __('emails.event_name'), 'value' => e($event->title)],
            ['label' => __('emails.organizer_name'), 'value' => e($emailData['organizer_name'])],
            ['label' => __('emails.event_date'), 'value' => e($emailData['event_date'])],
            ['label' => __('emails.tickets_sold'), 'value' => e($emailData['tickets_sold'])],
            ['label' => __('emails.revenue_generated'), 'value' => e($emailData['revenue_generated'])],
            ['label' => __('emails.cancellation_timestamp'), 'value' => e($emailData['cancelled_at'])],
        ],
    ])
@endsection
