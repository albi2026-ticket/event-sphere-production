<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

class TicketPolicy
{
    public function view(User $user, Ticket $ticket): bool
    {
        return $user->isAdmin() || $ticket->user_id === $user->id;
    }

    public function download(User $user, Ticket $ticket): bool
    {
        return $this->view($user, $ticket);
    }

    public function manage(User $user, Ticket $ticket): bool
    {
        return $user->isAdmin()
            || ($user->isOrganizer() && $ticket->event?->organizer_id === $user->id);
    }

    public function checkIn(User $user, Ticket $ticket): bool
    {
        return $this->manage($user, $ticket);
    }
}
