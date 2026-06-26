New Reservation Request

A new reservation request has been created for {{ $reservation->venue->name }}.

Guest: {{ $reservation->guest_name }}
Date: {{ $reservation->reservation_date->format('M j, Y') }}
Time: {{ $reservation->reservation_time }}
Party size: {{ $reservation->party_size }}
@if ($reservation->phone)
Phone: {{ $reservation->phone }}
@endif
@if ($reservation->occasion)
Occasion: {{ $reservation->occasion }}
@endif
@if ($reservation->notes)
Special Request: {{ $reservation->notes }}
@endif
