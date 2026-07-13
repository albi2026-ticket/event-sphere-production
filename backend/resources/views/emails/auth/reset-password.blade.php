@extends('emails.layouts.tiketa', [
    'title' => __('emails.reset_password_title'),
    'preheader' => __('emails.reset_password_text_copy'),
    'eyebrow' => __('emails.security_email_eyebrow'),
    'heading' => __('emails.reset_password_heading'),
    'intro' => __('emails.reset_password_copy'),
])

@section('content')
    @include('emails.components.text', ['size' => 'lead', 'text' => __('emails.hello', ['name' => $user->name ?: __('emails.there')])])

    @include('emails.components.account-hero', [
        'tone' => 'info',
        'mark' => 'KEY',
        'title' => __('emails.reset_password_box_title'),
        'copy' => e(__('emails.reset_password_box_copy')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $resetUrl, 'label' => __('emails.reset_password_button')])->render().'</div>',
    ])

    @include('emails.components.text', ['size' => 'muted', 'text' => __('emails.reset_password_expiry', ['minutes' => $expirationMinutes])])
    @include('emails.components.text', ['size' => 'muted', 'text' => __('emails.reset_password_ignore')])
    @include('emails.components.text', ['size' => 'small', 'text' => __('emails.fallback_link').'<br><a href="'.e($resetUrl).'" style="color:#2563eb;">'.e($resetUrl).'</a>'])
    @include('emails.components.text', ['size' => 'body', 'text' => __('emails.tiketa_team')])
@endsection
