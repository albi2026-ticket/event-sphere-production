<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;

class EventPolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, Event $event): bool
    {
        return $event->status === 'published'
            || ($user && $user->canManageEvent($event));
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isOrganizer();
    }

    public function update(User $user, Event $event): bool
    {
        return $user->canManageEvent($event);
    }

    public function delete(User $user, Event $event): bool
    {
        return $user->canManageEvent($event);
    }

    public function restore(User $user, Event $event): bool
    {
        return $user->isAdmin();
    }

    public function forceDelete(User $user, Event $event): bool
    {
        return $user->isAdmin();
    }
}
