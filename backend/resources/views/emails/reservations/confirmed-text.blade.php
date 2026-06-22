Reservation Confirmed

Hello {{ $reservation->guest_name }},

Your reservation at {{ $reservation->venue->name }} has been confirmed.

Date: {{ $reservation->reservation_date->format('M j, Y') }}
Time: {{ $reservation->reservation_time }}
Party size: {{ $reservation->party_size }}

Thank you for choosing Event Sphere. The venue has received your reservation details.
