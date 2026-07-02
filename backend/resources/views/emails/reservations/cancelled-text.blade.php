{{ __('emails.reservation_cancelled') }}

{{ __('emails.hello', ['name' => $reservation->guest_name]) }}

{{ __('emails.cancelled_copy', ['venue' => $reservation->venue->name]) }}

{{ __('emails.date') }}: {{ $reservation->reservation_date->format('M j, Y') }}
{{ __('emails.time') }}: {{ $reservation->reservation_time }}
{{ __('emails.party_size') }}: {{ $reservation->party_size }}
{{ __('emails.reason') }}: {{ $reservation->owner_cancellation_reason ?: ($reservation->cancellation_reason ?: '-') }}

{{ __('emails.thank_you') }}
