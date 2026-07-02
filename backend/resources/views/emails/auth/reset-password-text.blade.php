Tiketa

{{ __('emails.hello', ['name' => $user->name ?: __('emails.there')]) }}

{{ __('emails.reset_password_text_copy') }}

{{ __('emails.reset_password_button') }}:
{{ $resetUrl }}

{{ __('emails.reset_password_expiry', ['minutes' => $expirationMinutes]) }}

{{ __('emails.reset_password_ignore') }}

{{ __('emails.tiketa_team') }}
