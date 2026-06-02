<?php

namespace App\Http\Controllers\Api\Admin;

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

class AdminEventController extends Controller
{
    use FiltersEvents;

    public function index(EventIndexRequest $request): AnonymousResourceCollection
    {
        $query = Event::query()
            ->with(['organizer', 'images', 'ticketTypes'])
            ->withCount(['reviews', 'tickets', 'favorites']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $this->applyEventFilters($query, $request);

        return EventResource::collection($query->paginate($this->perPage($request)));
    }

    public function store(StoreEventRequest $request): EventResource
    {
        $payload = $request->validated();
        $payload['organizer_id'] = $payload['organizer_id'] ?? $request->user()->id;
        $payload['slug'] = $payload['slug'] ?? $this->uniqueSlug($payload['title']);
        $payload['status'] = $payload['status'] ?? 'draft';
        $payload['visibility'] = $payload['visibility'] ?? 'public';
        $payload['currency'] = strtoupper($payload['currency'] ?? 'USD');
        $payload['service_fee_percentage'] = 10;

        $event = Event::create($payload);

        return new EventResource($event->load(['organizer', 'images', 'ticketTypes']));
    }

    public function show(Event $event): EventResource
    {
        return new EventResource($event->load(['organizer', 'images', 'ticketTypes'])->loadCount(['reviews', 'tickets', 'favorites']));
    }

    public function update(UpdateEventRequest $request, Event $event): EventResource
    {
        $payload = $request->validated();

        if (isset($payload['title']) && ! isset($payload['slug'])) {
            $payload['slug'] = $this->uniqueSlug($payload['title'], $event);
        }

        if (isset($payload['currency'])) {
            $payload['currency'] = strtoupper($payload['currency']);
        }

        $event->update($payload);

        return new EventResource($event->fresh()->load(['organizer', 'images', 'ticketTypes']));
    }

    public function updateServiceFee(Request $request, Event $event): EventResource
    {
        $validated = $request->validate([
            'service_fee_percentage' => ['required', 'numeric', 'min:0', 'max:30'],
        ]);

        $event->update([
            'service_fee_percentage' => round((float) $validated['service_fee_percentage'], 2),
        ]);

        return new EventResource($event->fresh()->load(['organizer', 'images', 'ticketTypes']));
    }

    public function destroy(Event $event): JsonResponse
    {
        $event->delete();

        return response()->json(['message' => 'Event deleted.']);
    }

    public function publish(Event $event): EventResource
    {
        $event->update(['status' => 'published']);

        return new EventResource($event->fresh());
    }

    public function reject(Request $request, Event $event): EventResource
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);

        $event->update([
            'status' => 'rejected',
            'moderation_notes' => $request->input('reason', $event->moderation_notes),
        ]);

        return new EventResource($event->fresh());
    }

    public function unpublish(Request $request, Event $event): EventResource
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);

        $event->update([
            'status' => 'draft',
            'moderation_notes' => $request->input('reason', $event->moderation_notes),
        ]);

        return new EventResource($event->fresh());
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
