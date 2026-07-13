@extends('emails.layouts.tiketa', [
    'title' => __('emails.account_welcome_title'),
    'preheader' => __('emails.account_welcome_preheader'),
    'eyebrow' => __('emails.account_email_eyebrow'),
    'heading' => __('emails.account_welcome_heading'),
    'intro' => __('emails.account_welcome_intro', ['name' => $user->name ?: __('emails.there')]),
])

@section('content')
    @include('emails.components.account-hero', [
        'tone' => 'success',
        'mark' => 'T',
        'title' => __('emails.account_welcome_box_title'),
        'copy' => e(__('emails.account_welcome_box_copy')),
    ])

    @include('emails.components.text', ['size' => 'body', 'text' => __('emails.account_welcome_body')])
    @include('emails.components.button', ['url' => $dashboardUrl, 'label' => __('emails.view_dashboard')])
    @include('emails.components.text', ['size' => 'muted', 'text' => __('emails.account_welcome_footer_note')])
@endsection
