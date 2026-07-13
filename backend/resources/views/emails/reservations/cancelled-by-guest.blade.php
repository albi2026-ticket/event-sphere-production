@php
    $venue = $reservation->venue;
    $heroImage = $venue?->relationLoaded('images') ? $venue->images->first()?->publicUrl() : null;
    $ownerUrl = \App\Support\AppUrls::frontend('/site/owner-venue.html');
@endphp

@extends('emails.layouts.tiketa', [
    'title' => __('emails.reservation_cancelled_by_guest'),
    'preheader' => __('emails.guest_cancelled_copy', ['venue' => $venue->name]),
    'eyebrow' => __('emails.brand_reservations'),
    'heading' => __('emails.reservation_cancelled_by_guest'),
    'intro' => __('emails.guest_cancelled_copy', ['venue' => $venue->name]),
])

@section('content')
    @include('emails.components.hero-image', ['src' => $heroImage, 'alt' => $venue->name])

    @include('emails.components.message-box', [
        'type' => 'warning',
        'title' => __('emails.reservation_cancelled'),
        'body' => e(__('emails.owner_reservation_next_steps')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $ownerUrl, 'label' => __('emails.manage_reservation'), 'variant' => 'secondary'])->render().'</div>',
    ])

    @include('emails.components.details', [
        'items' => [
            ['label' => __('emails.guest_name'), 'value' => e($reservation->guest_name)],
            ['label' => __('emails.phone'), 'value' => e($reservation->phone ?: __('emails.not_provided'))],
            ['label' => __('emails.reservation_date'), 'value' => e($reservation->reservation_date->format('M j, Y'))],
            ['label' => __('emails.reservation_time'), 'value' => e($reservation->reservation_time)],
            ['label' => __('emails.party_size'), 'value' => e($reservation->party_size)],
            ['label' => __('emails.venue_name'), 'value' => e($venue->name)],
            ['label' => __('emails.cancellation_reason'), 'value' => e($reservation->cancellation_reason ?: __('emails.no_reason_provided'))],
            ['label' => __('emails.cancellation_timestamp'), 'value' => e($reservation->cancelled_at?->format('M j, Y g:i A'))],
        ],
    ])
@endsection
