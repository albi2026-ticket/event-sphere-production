<?php

namespace App\Http\Middleware;

use App\Models\Event;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizerOwnsEvent
{
    public function handle(Request $request, Closure $next): Response
    {
        $event = $request->route('event');

        if ($event instanceof Event) {
            abort_unless($request->user()?->canManageEvent($event), 403, __('validation.custom.forbidden'));
        }

        return $next($request);
    }
}
