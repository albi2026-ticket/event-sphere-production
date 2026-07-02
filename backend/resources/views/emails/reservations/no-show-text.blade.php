{{ __('emails.reservation_no_show') }}

{{ __('emails.hello', ['name' => $reservation->guest_name]) }}

{{ __('emails.no_show_copy', ['venue' => $reservation->venue->name]) }}

{{ __('emails.date') }}: {{ $reservation->reservation_date->format('M j, Y') }}
{{ __('emails.time') }}: {{ $reservation->reservation_time }}
{{ __('emails.party_size') }}: {{ $reservation->party_size }}

{{ __('emails.no_show_help_copy') }}
