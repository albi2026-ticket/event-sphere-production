<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FiltersEvents;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\EventIndexRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EventController extends Controller
{
    use FiltersEvents;

    public function index(EventIndexRequest $request): AnonymousResourceCollection
    {
        $query = Event::query()
            ->with(['images', 'ticketTypes'])
            ->withCount(['reviews', 'favorites'])
            ->where('status', 'published')
            ->where('visibility', 'public');

        $this->applyEventFilters($query, $request);

        return EventResource::collection($query->paginate($this->perPage($request)));
    }

    public function show(Event $event): EventResource
    {
        abort_unless($event->status === 'published' && $event->visibility === 'public', 404);

        $event->increment('views_count');

        return new EventResource($event->load(['organizer', 'images', 'ticketTypes'])->loadCount(['reviews', 'favorites']));
    }
}
