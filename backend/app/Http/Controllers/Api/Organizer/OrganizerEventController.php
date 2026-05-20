<?php

namespace App\Http\Controllers\Api\Organizer;

use App\Http\Controllers\Api\Concerns\FiltersEvents;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\EventIndexRequest;
use App\Http\Requests\Api\StoreEventRequest;
use App\Http\Requests\Api\StoreTicketTypeRequest;
use App\Http\Requests\Api\UpdateEventRequest;
use App\Http\Requests\Api\UpdateTicketTypeRequest;
use App\Http\Resources\EventResource;
use App\Http\Resources\TicketTypeResource;
use App\Models\Event;
use App\Models\TicketType;
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

    public function storeTicketType(StoreTicketTypeRequest $request, Event $event): TicketTypeResource
    {
        $ticketType = $event->ticketTypes()->create($request->validated());

        if (! $event->base_price || $ticketType->price < $event->base_price) {
            $event->update(['base_price' => $ticketType->price, 'currency' => $ticketType->currency]);
        }

        return new TicketTypeResource($ticketType);
    }

    public function updateTicketType(UpdateTicketTypeRequest $request, TicketType $ticketType): TicketTypeResource
    {
        $ticketType->update($request->validated());

        return new TicketTypeResource($ticketType->fresh());
    }

    public function destroyTicketType(Request $request, TicketType $ticketType): JsonResponse
    {
        abort_unless($request->user()->canManageEvent($ticketType->event), 403);

        abort_if($ticketType->quantity_sold > 0, 422, 'Ticket types with sold tickets cannot be deleted.');

        $ticketType->delete();

        return response()->json(['message' => 'Ticket type deleted.']);
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
