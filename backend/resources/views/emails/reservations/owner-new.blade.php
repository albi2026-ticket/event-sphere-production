@php
    $venue = $reservation->venue;
    $heroImage = $venue?->relationLoaded('images') ? $venue->images->first()?->publicUrl() : null;
    $ownerUrl = \App\Support\AppUrls::frontend('/site/owner-venue.html');
@endphp

@extends('emails.layouts.tiketa', [
    'title' => __('emails.owner_new_reservation'),
    'preheader' => __('emails.owner_new_copy', ['venue' => $venue->name]),
    'eyebrow' => __('emails.brand_reservations'),
    'heading' => __('emails.owner_new_reservation'),
    'intro' => __('emails.owner_new_copy', ['venue' => $venue->name]),
])

@section('content')
    @include('emails.components.hero-image', ['src' => $heroImage, 'alt' => $venue->name])

    @include('emails.components.message-box', [
        'type' => 'info',
        'title' => __('emails.reservation_request_received'),
        'body' => e(__('emails.owner_reservation_next_steps')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $ownerUrl, 'label' => __('emails.manage_reservation')])->render().'</div>',
    ])

    @include('emails.components.details', [
        'items' => [
            ['label' => __('emails.guest'), 'value' => e($reservation->guest_name)],
            ['label' => __('emails.phone'), 'value' => e($reservation->phone ?: __('emails.not_provided'))],
            ['label' => __('emails.date'), 'value' => e($reservation->reservation_date->format('M j, Y'))],
            ['label' => __('emails.time'), 'value' => e($reservation->reservation_time)],
            ['label' => __('emails.party_size'), 'value' => e($reservation->party_size)],
            ['label' => __('emails.occasion'), 'value' => e($reservation->occasion)],
            ['label' => __('emails.special_request'), 'value' => e($reservation->notes)],
        ],
    ])
@endsection
