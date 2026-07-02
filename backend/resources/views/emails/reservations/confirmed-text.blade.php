{{ __('emails.reservation_confirmed') }}

{{ __('emails.hello', ['name' => $reservation->guest_name]) }}

{{ __('emails.confirmed_copy', ['venue' => $reservation->venue->name]) }}

{{ __('emails.date') }}: {{ $reservation->reservation_date->format('M j, Y') }}
{{ __('emails.time') }}: {{ $reservation->reservation_time }}
{{ __('emails.party_size') }}: {{ $reservation->party_size }}
@if ($reservation->occasion)
{{ __('emails.occasion') }}: {{ $reservation->occasion }}
@endif
@if ($reservation->notes)
{{ __('emails.special_request') }}: {{ $reservation->notes }}
@endif

{{ __('emails.thank_you') }}
