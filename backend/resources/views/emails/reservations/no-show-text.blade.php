Reservation Marked As No Show

Hello {{ $reservation->guest_name }},

Your reservation at {{ $reservation->venue->name }} has been marked as no show.

Date: {{ $reservation->reservation_date->format('M j, Y') }}
Time: {{ $reservation->reservation_time }}
Party size: {{ $reservation->party_size }}

If you believe this was marked incorrectly, please contact the venue directly.
