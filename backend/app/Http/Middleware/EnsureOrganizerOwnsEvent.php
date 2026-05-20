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
            abort_unless($request->user()?->canManageEvent($event), 403, 'You can only access your own event data.');
        }

        return $next($request);
    }
}
