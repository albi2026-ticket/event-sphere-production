Tiketa

{{ __('emails.verify_email_welcome', ['name' => $user->name ?: __('emails.there')]) }}

{{ __('emails.verify_email_copy') }}

{{ __('emails.verify_email_button') }}:
{!! $verificationUrl !!}

{{ __('emails.verify_email_expiry', ['minutes' => $expirationMinutes]) }}

{{ __('emails.verify_email_ignore') }}
