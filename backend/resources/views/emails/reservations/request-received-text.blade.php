Reservation Request Received

Hello {{ $reservation->guest_name }},

Your reservation request at {{ $reservation->venue->name }} has been received.

Date: {{ $reservation->reservation_date->format('M j, Y') }}
Time: {{ $reservation->reservation_time }}
Party size: {{ $reservation->party_size }}

The venue will review your request and confirm availability.
