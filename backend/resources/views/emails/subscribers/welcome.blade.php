@php
    $sourceLabel = $subscription->source === 'restaurants'
        ? __('emails.welcome_updates_source_restaurants')
        : __('emails.welcome_updates_source_events');
@endphp

@extends('emails.layouts.tiketa', [
    'title' => __('emails.welcome_updates_title'),
    'preheader' => __('emails.welcome_updates_preheader'),
    'eyebrow' => __('emails.email_notification'),
    'heading' => __('emails.welcome_updates_heading'),
    'intro' => __('emails.welcome_updates_intro'),
])

@section('content')
    @include('emails.components.message-box', [
        'type' => 'success',
        'title' => __('emails.welcome_updates_box_title'),
        'body' => e(__('emails.welcome_updates_source_copy', ['source' => $sourceLabel])),
    ])

    @include('emails.components.text', ['size' => 'body', 'text' => __('emails.welcome_updates_body')])
    @include('emails.components.button', ['url' => $unsubscribeUrl, 'label' => __('emails.manage_subscription')])
    @include('emails.components.text', ['size' => 'muted', 'text' => __('emails.unsubscribe_anytime')])
@endsection
