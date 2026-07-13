@extends('emails.layouts.tiketa', [
    'title' => __('emails.email_changed_title'),
    'preheader' => __('emails.email_changed_preheader'),
    'eyebrow' => __('emails.security_email_eyebrow'),
    'heading' => __('emails.email_changed_heading'),
    'intro' => __('emails.email_changed_intro', ['name' => $user->name ?: __('emails.there')]),
])

@section('content')
    @include('emails.components.account-hero', [
        'tone' => 'success',
        'mark' => '@',
        'title' => __('emails.email_changed_box_title'),
        'copy' => e(__('emails.email_changed_box_copy', ['email' => $newEmail])),
    ])

    @include('emails.components.details', [
        'items' => [
            ['label' => __('emails.previous_email'), 'value' => e($oldEmail)],
            ['label' => __('emails.new_email'), 'value' => e($newEmail)],
            ['label' => __('emails.updated_at'), 'value' => e($changedAt)],
        ],
    ])

    @include('emails.components.message-box', [
        'type' => 'warning',
        'title' => __('emails.email_changed_help_title'),
        'body' => e(__('emails.email_changed_help_copy')).'<div style="margin-top:16px;">'.view('emails.components.button', ['url' => $securityUrl, 'label' => __('emails.review_account_security'), 'variant' => 'secondary'])->render().'</div>',
    ])
@endsection
