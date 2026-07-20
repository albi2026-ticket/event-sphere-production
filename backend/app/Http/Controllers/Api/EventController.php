<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FiltersEvents;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\EventIndexRequest;
use App\Http\Resources\EventDetailResource;
use App\Http\Resources\EventListingResource;
use App\Models\CheckoutReservation;
use App\Models\Event;
use App\Models\Order;
use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class EventController extends Controller
{
    use FiltersEvents;

    public function index(EventIndexRequest $request): AnonymousResourceCollection
    {
        $sort = $request->validated()['sort'] ?? 'soonest';
        $query = $this->eventListingQuery($sort === 'trending');

        $this->applyEventFilters($query, $request);

        return EventListingResource::collection($query->paginate($this->perPage($request)));
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

    private function eventListingQuery(bool $includeTrendingMetrics = false): Builder
    {
        $ticketPrices = DB::table('ticket_types')
            ->select('event_id')
            ->selectRaw('MIN(price) as minimum_price')
            ->where('status', 'active')
            ->groupBy('event_id');

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
            ->addSelect(DB::raw('ticket_prices.minimum_price as minimum_price'))
            ->leftJoinSub($ticketPrices, 'ticket_prices', function ($join): void {
                $join->on('ticket_prices.event_id', '=', 'events.id');
            })
            ->with(['images:id,event_id,disk,path,url,type,is_primary,is_banner,sort_order'])
            ->publicDiscovery();

        if (! $includeTrendingMetrics) {
            return $query;
        }

        $favoriteCounts = DB::table('favorites')
            ->select('event_id')
            ->selectRaw('COUNT(*) as favorites_count')
            ->groupBy('event_id');

        $ticketMetrics = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->select('order_items.event_id')
            ->selectRaw('SUM(order_items.quantity) as tickets_sold_count')
            ->selectRaw('SUM(CASE WHEN order_items.created_at >= ? THEN order_items.quantity END) as recent_tickets_sold_count', [now()->subDays(7)])
            ->where('orders.payment_status', Order::PAYMENT_STATUS_PAID)
            ->groupBy('order_items.event_id');

        return $query
            ->leftJoinSub($favoriteCounts, 'favorite_counts', function ($join): void {
                $join->on('favorite_counts.event_id', '=', 'events.id');
            })
            ->leftJoinSub($ticketMetrics, 'ticket_metrics', function ($join): void {
                $join->on('ticket_metrics.event_id', '=', 'events.id');
            })
            ->addSelect([
                DB::raw('COALESCE(favorite_counts.favorites_count, 0) as favorites_count'),
                DB::raw('ticket_metrics.tickets_sold_count as tickets_sold_count'),
                DB::raw('ticket_metrics.recent_tickets_sold_count as recent_tickets_sold_count'),
            ]);
    }
}
