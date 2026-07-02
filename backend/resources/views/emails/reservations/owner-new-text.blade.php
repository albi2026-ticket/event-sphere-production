{{ __('emails.owner_new_reservation') }}

{{ __('emails.owner_new_copy', ['venue' => $reservation->venue->name]) }}

{{ __('emails.guest') }}: {{ $reservation->guest_name }}
{{ __('emails.date') }}: {{ $reservation->reservation_date->format('M j, Y') }}
{{ __('emails.time') }}: {{ $reservation->reservation_time }}
{{ __('emails.party_size') }}: {{ $reservation->party_size }}
@if ($reservation->phone)
{{ __('emails.phone') }}: {{ $reservation->phone }}
@endif
@if ($reservation->occasion)
{{ __('emails.occasion') }}: {{ $reservation->occasion }}
@endif
@if ($reservation->notes)
{{ __('emails.special_request') }}: {{ $reservation->notes }}
@endif
