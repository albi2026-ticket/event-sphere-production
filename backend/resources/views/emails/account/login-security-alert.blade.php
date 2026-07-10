@extends('emails.layouts.tiketa', [
    'title' => __('emails.login_security_title'),
    'preheader' => __('emails.login_security_preheader'),
    'eyebrow' => __('emails.security_email_eyebrow'),
    'heading' => __('emails.login_security_heading'),
    'intro' => __('emails.login_security_intro', ['name' => $user->name ?: __('emails.there')]),
])

@section('content')
    @include('emails.components.account-hero', [
        'tone' => 'warning',
        'mark' => '!',
        'title' => __('emails.login_security_box_title'),
        'copy' => e(__('emails.login_security_box_copy')),
    ])

    @include('emails.components.details', [
        'items' => [
            ['label' => __('emails.sign_in_time'), 'value' => e($signedInAt)],
            ['label' => __('emails.location'), 'value' => e($location)],
            ['label' => __('emails.device'), 'value' => e($device)],
        ],
    ])

    @include('emails.components.message-box', [
        'type' => 'warning',
        'title' => __('emails.login_security_help_title'),
        'body' => e(__('emails.login_security_help_copy')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $securityUrl, 'label' => __('emails.secure_account'), 'variant' => 'secondary'])->render().'</div>',
    ])
@endsection
