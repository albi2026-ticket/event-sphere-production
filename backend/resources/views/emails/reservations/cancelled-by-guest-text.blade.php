{{ __('emails.reservation_cancelled_by_guest') }}

{{ __('emails.guest_cancelled_copy', ['venue' => $reservation->venue->name]) }}

{{ __('emails.guest_name') }}: {{ $reservation->guest_name }}
{{ __('emails.phone') }}: {{ $reservation->phone ?: __('emails.not_provided') }}
{{ __('emails.reservation_date') }}: {{ $reservation->reservation_date->format('M j, Y') }}
{{ __('emails.reservation_time') }}: {{ $reservation->reservation_time }}
{{ __('emails.party_size') }}: {{ $reservation->party_size }}
{{ __('emails.venue_name') }}: {{ $reservation->venue->name }}
{{ __('emails.cancellation_reason') }}: {{ $reservation->cancellation_reason ?: __('emails.no_reason_provided') }}
{{ __('emails.cancellation_timestamp') }}: {{ $reservation->cancelled_at?->format('M j, Y g:i A') }}
