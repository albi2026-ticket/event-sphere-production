@extends('emails.layouts.tiketa', [
    'title' => __('emails.password_changed_title'),
    'preheader' => __('emails.password_changed_preheader'),
    'eyebrow' => __('emails.security_email_eyebrow'),
    'heading' => __('emails.password_changed_heading'),
    'intro' => __('emails.password_changed_intro', ['name' => $user->name ?: __('emails.there')]),
])

@section('content')
    @include('emails.components.account-hero', [
        'tone' => 'success',
        'mark' => 'OK',
        'title' => __('emails.password_changed_box_title'),
        'copy' => e(__('emails.password_changed_box_copy', ['time' => $changedAt])),
    ])

    @include('emails.components.message-box', [
        'type' => 'info',
        'title' => __('emails.password_changed_help_title'),
        'body' => e(__('emails.password_changed_help_copy')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $securityUrl, 'label' => __('emails.review_account_security')])->render().'</div>',
    ])
@endsection
