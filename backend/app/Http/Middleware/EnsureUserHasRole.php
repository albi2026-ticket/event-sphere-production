<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || $user->status !== User::STATUS_ACTIVE) {
            abort(403, 'This account is not allowed to access this resource.');
        }

        if ($user->isAdmin()) {
            return $next($request);
        }

        if (! in_array($user->role, $roles, true)) {
            abort(403, 'Your account role is not allowed to access this resource.');
        }

        if ($roles === [User::ROLE_ORGANIZER] && $user->role === User::ROLE_ORGANIZER && ! $user->isOrganizer()) {
            abort(403, 'Organizer access requires admin approval.');
        }

        return $next($request);
    }
}
