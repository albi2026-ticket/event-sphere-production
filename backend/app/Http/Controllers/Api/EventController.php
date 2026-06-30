<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FiltersEvents;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\EventIndexRequest;
use App\Http\Resources\EventDetailResource;
use App\Http\Resources\EventListingResource;
use App\Models\CheckoutReservation;
use App\Models\Event;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;

class EventController extends Controller
{
    use FiltersEvents;

    public function index(EventIndexRequest $request): AnonymousResourceCollection
    {
        $query = Event::query()
            ->select([
                'events.id',
                'events.title',
                'events.slug',
                'events.category',
                'events.venue_name',
                'events.city',
                'events.starts_at',
                'events.ends_at',
                'events.timezone',
                'events.status',
                'events.visibility',
                'events.banner_image_url',
                'events.base_price',
                'events.currency',
                'events.views_count',
            ])
            ->with(['images:id,event_id,disk,path,url,is_primary,sort_order'])
            ->withMin([
                'ticketTypes as minimum_price' => fn (Builder $query) => $query->where('status', 'active'),
            ], 'price')
            ->withCount('favorites')
            ->withDiscoveryMetrics()
            ->publicDiscovery();

        $this->applyEventFilters($query, $request);

        return EventListingResource::collection($query->paginate($this->perPage($request)));
    }

    public function show(Event $event): EventDetailResource
    {
        abort_unless($event->status === 'published' && $event->visibility === 'public', 404);

        $event->increment('views_count');

        return new EventDetailResource($event->load([
            'organizer:id,name,role',
            'images' => fn ($query) => $query
                ->orderByDesc('is_primary')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->limit(1),
            'ticketTypes' => fn ($query) => $query
                ->whereIn('status', ['active', 'sold_out'])
                ->withSum([
                    'checkoutReservations as active_checkout_reserved_quantity' => fn ($query) => $query
                        ->where('status', CheckoutReservation::STATUS_ACTIVE)
                        ->whereNull('order_id')
                        ->where('expires_at', '>', now()),
                ], 'quantity'),
        ]));
    }

    public function related(Event $event): AnonymousResourceCollection
    {
        abort_unless($event->status === 'published' && $event->visibility === 'public', 404);

        $cacheKey = "events.related.{$event->id}.{$event->updated_at?->timestamp}";

        $events = Cache::remember($cacheKey, now()->addSeconds(60), fn () => Event::query()
            ->select([
                'events.id',
                'events.title',
                'events.slug',
                'events.category',
                'events.venue_name',
                'events.city',
                'events.starts_at',
                'events.ends_at',
                'events.timezone',
                'events.status',
                'events.visibility',
                'events.banner_image_url',
                'events.base_price',
                'events.currency',
                'events.views_count',
            ])
            ->whereKeyNot($event->id)
            ->where('events.category', $event->category)
            ->with(['images:id,event_id,disk,path,url,is_primary,sort_order'])
            ->withMin([
                'ticketTypes as minimum_price' => fn (Builder $query) => $query->where('status', 'active'),
            ], 'price')
            ->withCount('favorites')
            ->withDiscoveryMetrics()
            ->publicDiscovery()
            ->orderBy('events.starts_at')
            ->limit(6)
            ->get());

        return EventListingResource::collection($events);
    }
}
