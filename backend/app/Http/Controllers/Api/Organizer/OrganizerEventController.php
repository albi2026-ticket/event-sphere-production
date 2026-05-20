<?php

namespace App\Http\Controllers\Api\Organizer;

use App\Http\Controllers\Api\Concerns\FiltersEvents;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\EventIndexRequest;
use App\Http\Requests\Api\StoreEventRequest;
use App\Http\Requests\Api\UpdateEventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class OrganizerEventController extends Controller
{
    use FiltersEvents;

    public function index(EventIndexRequest $request): AnonymousResourceCollection
    {
        $query = $request->user()
            ->organizedEvents()
            ->with(['images', 'ticketTypes'])
            ->withCount(['reviews', 'tickets', 'favorites']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $this->applyEventFilters($query, $request);

        return EventResource::collection($query->paginate($this->perPage($request)));
    }

    public function store(StoreEventRequest $request): EventResource
    {
        $event = Event::create($this->eventPayload($request, $request->user()->id));

        return new EventResource($event->load(['images', 'ticketTypes']));
    }

    public function show(Request $request, Event $event): EventResource
    {
        abort_unless($request->user()->canManageEvent($event), 403);

        return new EventResource($event->load(['organizer', 'images', 'ticketTypes'])->loadCount(['reviews', 'tickets', 'favorites']));
    }

    public function update(UpdateEventRequest $request, Event $event): EventResource
    {
        $event->update($this->eventPayload($request, $event->organizer_id, true));

        return new EventResource($event->fresh()->load(['images', 'ticketTypes']));
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        abort_unless($request->user()->canManageEvent($event), 403);

        $event->delete();

        return response()->json(['message' => 'Event deleted.']);
    }

    protected function eventPayload(Request $request, int $organizerId, bool $partial = false): array
    {
        $payload = $request->validated();

        if ((! $partial || array_key_exists('title', $payload)) && ! array_key_exists('slug', $payload)) {
            $payload['slug'] = $payload['slug'] ?? $this->uniqueSlug($payload['title'], $request->route('event'));
        }

        $payload['organizer_id'] = $organizerId;
        $payload['status'] = $payload['status'] ?? 'draft';
        $payload['visibility'] = $payload['visibility'] ?? 'public';
        $payload['currency'] = strtoupper($payload['currency'] ?? 'USD');

        return $payload;
    }

    protected function uniqueSlug(string $title, ?Event $event = null): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $counter = 2;

        while (Event::query()
            ->where('slug', $slug)
            ->when($event, fn ($query) => $query->whereKeyNot($event->id))
            ->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
