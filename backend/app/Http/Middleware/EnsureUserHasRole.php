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
            abort(403, __('validation.custom.forbidden'));
        }

        if ($user->isAdmin()) {
            return $next($request);
        }

        if (! in_array($user->role, $roles, true)) {
            abort(403, __('validation.custom.forbidden'));
        }

        if (in_array(User::ROLE_ORGANIZER, $roles, true)
            && $user->role === User::ROLE_ORGANIZER
            && ! $user->isOrganizer()) {
            abort(403, __('validation.custom.organizer_pending_approval'));
        }

        return $next($request);
    }
}
