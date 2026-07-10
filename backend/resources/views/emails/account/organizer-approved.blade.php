@extends('emails.layouts.tiketa', [
    'title' => __('emails.organizer_approved_title'),
    'preheader' => __('emails.organizer_approved_preheader'),
    'eyebrow' => __('emails.organizer_email_eyebrow'),
    'heading' => __('emails.organizer_approved_heading'),
    'intro' => __('emails.organizer_approved_intro', ['name' => $user->name ?: __('emails.there')]),
])

@section('content')
    @include('emails.components.account-hero', [
        'tone' => 'success',
        'mark' => 'GO',
        'title' => __('emails.organizer_approved_box_title'),
        'copy' => e(__('emails.organizer_approved_box_copy')),
    ])

    @include('emails.components.message-box', [
        'type' => 'info',
        'title' => __('emails.organizer_approved_next_title'),
        'body' => e(__('emails.organizer_approved_next_copy')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $organizerUrl, 'label' => __('emails.organizer_dashboard')])->render().'</div>',
    ])
@endsection
