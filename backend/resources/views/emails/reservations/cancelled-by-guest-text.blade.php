Reservation Cancelled by Guest

A guest has cancelled a reservation for {{ $reservation->venue->name }}.

Guest Name: {{ $reservation->guest_name }}
Phone: {{ $reservation->phone ?: 'Not provided' }}
Reservation Date: {{ $reservation->reservation_date->format('M j, Y') }}
Reservation Time: {{ $reservation->reservation_time }}
Party Size: {{ $reservation->party_size }}
Venue Name: {{ $reservation->venue->name }}
Cancellation Reason: {{ $reservation->cancellation_reason ?: 'No reason provided.' }}
Cancellation Timestamp: {{ $reservation->cancelled_at?->format('M j, Y g:i A') }}
