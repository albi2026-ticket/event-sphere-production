@php
    $venue = $reservation->venue;
    $heroImage = $venue?->relationLoaded('images') ? $venue->images->first()?->publicUrl() : null;
    $reservationUrl = \App\Support\AppUrls::frontend('/site/my-reservations.html');
@endphp

@extends('emails.layouts.tiketa', [
    'title' => __('emails.reservation_completed'),
    'preheader' => __('emails.completed_copy', ['venue' => $venue->name]),
    'eyebrow' => __('emails.brand_reservations'),
    'heading' => __('emails.reservation_completed'),
    'intro' => __('emails.completed_copy', ['venue' => $venue->name]),
])

@section('content')
    @include('emails.components.hero-image', ['src' => $heroImage, 'alt' => $venue->name])
    @include('emails.components.text', ['size' => 'lead', 'text' => __('emails.hello', ['name' => $reservation->guest_name])])

    @include('emails.components.details', [
        'items' => [
            ['label' => __('emails.restaurant'), 'value' => e($venue->name)],
            ['label' => __('emails.date'), 'value' => e($reservation->reservation_date->format('M j, Y'))],
            ['label' => __('emails.time'), 'value' => e($reservation->reservation_time)],
            ['label' => __('emails.party_size'), 'value' => e($reservation->party_size)],
        ],
    ])

    @include('emails.components.message-box', [
        'type' => 'success',
        'title' => __('emails.thank_you'),
        'body' => e(__('emails.thank_you')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $reservationUrl, 'label' => __('emails.view_reservation')])->render().'</div>',
    ])
@endsection
