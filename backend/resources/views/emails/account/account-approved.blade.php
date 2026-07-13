@extends('emails.layouts.tiketa', [
    'title' => __('emails.account_approved_title'),
    'preheader' => __('emails.account_approved_preheader'),
    'eyebrow' => __('emails.account_email_eyebrow'),
    'heading' => __('emails.account_approved_heading'),
    'intro' => __('emails.account_approved_intro', ['name' => $user->name ?: __('emails.there')]),
])

@section('content')
    @include('emails.components.account-hero', [
        'tone' => 'success',
        'mark' => 'OK',
        'title' => __('emails.account_approved_box_title'),
        'copy' => e(__('emails.account_approved_box_copy')),
    ])

    @include('emails.components.button', ['url' => $dashboardUrl, 'label' => __('emails.view_dashboard')])
    @include('emails.components.text', ['size' => 'muted', 'text' => __('emails.account_approved_footer_note')])
@endsection
