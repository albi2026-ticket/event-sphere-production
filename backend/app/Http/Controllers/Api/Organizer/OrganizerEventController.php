<?php

namespace App\Http\Controllers\Api\Organizer;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizerEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()
                ->organizedEvents()
                ->latest()
                ->paginate(15),
        ]);
    }

    public function show(Request $request, Event $event): JsonResponse
    {
        abort_unless($request->user()->canManageEvent($event), 403);

        return response()->json([
            'data' => $event->load(['images', 'ticketTypes']),
        ]);
    }
}
