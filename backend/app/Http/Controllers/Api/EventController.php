<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FiltersEvents;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\EventIndexRequest;
use App\Http\Resources\EventDetailResource;
use App\Http\Resources\EventListingResource;
use App\Models\CheckoutReservation;
use App\Models\Event;
use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;

class EventController extends Controller
{
    use FiltersEvents;

    public function index(EventIndexRequest $request): AnonymousResourceCollection
    {
        Profiler::begin('EventController@index');

        $sort = Profiler::section('Read validated sort', fn (): string => $request->validated()['sort'] ?? 'soonest');

        $query = Profiler::section('Build Event listing query', fn (): Builder => Event::query()
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
            ->with(['images:id,event_id,disk,path,url,type,is_primary,is_banner,sort_order'])
            ->withMin([
                'ticketTypes as minimum_price' => fn (Builder $query) => $query->where('status', 'active'),
            ], 'price')
            ->publicDiscovery());

        if ($sort === 'trending') {
            Profiler::section('Apply trending metrics eager counts', fn () => $query
                ->withCount('favorites')
                ->withDiscoveryMetrics());
        }

        Profiler::section('Apply event filters helper', function () use ($query, $request): void {
            $this->applyEventFilters($query, $request);
        });

        $perPage = Profiler::section('perPage helper', fn (): int => $this->perPage($request));
        $paginated = Profiler::section('Event pagination', fn () => $query->paginate($perPage));

        return Profiler::section('EventListingResource collection create', fn (): AnonymousResourceCollection => EventListingResource::collection($paginated));
    }

    public function show(Event $event): EventDetailResource
    {
        Profiler::begin('EventController@show');

        Profiler::section('Assert public published event', fn () => abort_unless($event->status === 'published' && $event->visibility === 'public', 404));

        Profiler::section('Increment views_count', fn () => $event->increment('views_count'));

        $event = Profiler::section('Event detail eager load', fn (): Event => $event->load([
            'organizer:id,name,role',
            'images' => fn ($query) => $query
                ->orderByDesc('is_primary')
                ->orderByDesc('is_banner')
                ->orderBy('sort_order')
                ->orderBy('id'),
            'ticketTypes' => fn ($query) => $query
                ->whereIn('status', ['active', 'sold_out'])
                ->withSum([
                    'checkoutReservations as active_checkout_reserved_quantity' => fn ($query) => $query
                        ->where('status', CheckoutReservation::STATUS_ACTIVE)
                        ->whereNull('order_id')
                        ->where('expires_at', '>', now()),
                ], 'quantity'),
        ]));

        return Profiler::section('EventDetailResource create', fn (): EventDetailResource => new EventDetailResource($event));
    }

    public function related(Event $event): AnonymousResourceCollection
    {
        Profiler::begin('EventController@related');

        Profiler::section('Assert public published event', fn () => abort_unless($event->status === 'published' && $event->visibility === 'public', 404));

        $cacheKey = Profiler::section('Build related cache key', fn (): string => "events.related.{$event->id}.{$event->updated_at?->timestamp}");

        $eventIds = Profiler::section('Cache::remember related event ids', fn (): array => Cache::remember($cacheKey, now()->addSeconds(60), fn () => Profiler::section('Related event id query pluck', fn (): array => Event::query()
            ->select([
                'events.id',
            ])
            ->whereKeyNot($event->id)
            ->where('events.category', $event->category)
            ->publicDiscovery()
            ->orderBy('events.starts_at')
            ->limit(6)
            ->pluck('events.id')
            ->all())));

        $events = Profiler::section('Load related Event collection', fn () => Event::query()
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
            ->whereKey($eventIds)
            ->with(['images:id,event_id,disk,path,url,type,is_primary,is_banner,sort_order'])
            ->withMin([
                'ticketTypes as minimum_price' => fn (Builder $query) => $query->where('status', 'active'),
            ], 'price')
            ->publicDiscovery()
            ->orderBy('events.starts_at')
            ->get());

        return Profiler::section('EventListingResource related collection create', fn (): AnonymousResourceCollection => EventListingResource::collection($events));
    }
}
