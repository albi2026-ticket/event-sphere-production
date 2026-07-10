@extends('emails.layouts.tiketa', [
    'title' => __('emails.verify_email_title'),
    'preheader' => __('emails.verify_email_copy'),
    'eyebrow' => __('emails.account_email_eyebrow'),
    'heading' => __('emails.verify_email_heading'),
    'intro' => __('emails.verify_email_welcome', ['name' => $user->name ?: __('emails.there')]),
])

@section('content')
    @include('emails.components.account-hero', [
        'tone' => 'success',
        'mark' => 'OK',
        'title' => __('emails.verify_email_box_title'),
        'copy' => e(__('emails.verify_email_box_copy')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $verificationUrl, 'label' => __('emails.verify_email_button')])->render().'</div>',
    ])

    @include('emails.components.text', ['size' => 'muted', 'text' => __('emails.verify_email_expiry_html', ['minutes' => $expirationMinutes])])
    @include('emails.components.text', ['size' => 'small', 'text' => __('emails.fallback_link').'<br><a href="'.e($verificationUrl).'" style="color:#2563eb;">'.e($verificationUrl).'</a>'])
@endsection
