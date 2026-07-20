<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FiltersEvents;
use App\Http\Controllers\Controller;
use App\Http\Resources\HomepageEventResource;
use App\Models\Event;
use App\Models\EventCategory;
use App\Support\HomepageCache;
use App\Support\Performance\DeepControllerProfiler as Profiler;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HomepageController extends Controller
{
    use FiltersEvents;

    public function index(Request $request): JsonResponse
    {
        Profiler::begin('HomepageController@index');

        $limits = Profiler::section('Build homepage limits', fn (): array => [
            'featured_limit' => $this->limit($request, 8, 'featured_limit'),
            'trending_limit' => $this->limit($request, 8, 'trending_limit'),
            'upcoming_limit' => $this->limit($request, 8, 'upcoming_limit'),
            'category_limit' => $this->limit($request, 3, 'category_limit'),
        ]);

        $data = Profiler::section('Cache::remember homepage endpoint', fn (): array => Cache::remember(HomepageCache::endpointKey($limits), HomepageCache::ttl(), function () use ($request): array {
            $featured = Profiler::section('Featured Events', fn () => $this->featuredEvents($request));
            $trending = Profiler::section('Trending Events', fn () => $this->trendingEvents($request));
            $upcoming = Profiler::section('Upcoming Events', fn () => $this->upcomingEvents($request));
            $categories = Profiler::section('Categories', fn (): array => $this->categoryGroups($request));

            return [
                'featured_events' => Profiler::section('Transform featured events payload', fn (): array => $this->eventsData($featured, $request)),
                'trending_events' => Profiler::section('Transform trending events payload', fn (): array => $this->eventsData($trending, $request)),
                'upcoming_events' => Profiler::section('Transform upcoming events payload', fn (): array => $this->eventsData($upcoming, $request)),
                'categories' => $categories,
                'featured_venues' => Profiler::section('Featured Venues', fn (): array => $this->featuredVenues()),
                'popular_venues' => Profiler::section('Popular Venues', fn (): array => $this->popularVenues()),
            ];
        }));

        return Profiler::section('Return response()->json homepage', fn (): JsonResponse => response()->json(['data' => $data]));
    }

    public function featured(Request $request): JsonResponse
    {
        Profiler::begin('HomepageController@featured');

        return Profiler::section('Return featured event response', fn (): JsonResponse => $this->eventResponse(
            Profiler::section('Featured Events', fn () => $this->featuredEvents($request))
        ));
    }

    public function trending(Request $request): JsonResponse
    {
        Profiler::begin('HomepageController@trending');

        return Profiler::section('Return trending event response', fn (): JsonResponse => $this->eventResponse(
            Profiler::section('Trending Events', fn () => $this->trendingEvents($request))
        ));
    }

    public function upcoming(Request $request): JsonResponse
    {
        Profiler::begin('HomepageController@upcoming');

        return Profiler::section('Return upcoming event response', fn (): JsonResponse => $this->eventResponse(
            Profiler::section('Upcoming Events', fn () => $this->upcomingEvents($request))
        ));
    }

    public function recommendations(Request $request): JsonResponse
    {
        Profiler::begin('HomepageController@recommendations');

        return Profiler::section('Return recommendations event response', fn (): JsonResponse => $this->eventResponse(
            Profiler::section('Trending Events', fn () => $this->trendingEvents($request))
        ));
    }

    public function categories(Request $request): JsonResponse
    {
        Profiler::begin('HomepageController@categories');

        $categories = Profiler::section('Categories', fn (): array => $this->categoryGroups($request));

        return Profiler::section('Return response()->json categories', fn (): JsonResponse => response()->json(['data' => $categories]));
    }

    private function featuredEvents(Request $request)
    {
        $limit = Profiler::section('featuredEvents limit helper', fn (): int => $this->limit($request, 8, 'featured_limit'));

        $eventIds = Profiler::section('Cache::remember featured_event_ids', fn (): array => Cache::remember(HomepageCache::sectionKey('featured_event_ids', $limit), HomepageCache::ttl(), fn () => (
            Profiler::section('Featured ranked event id query pluck', fn (): array => $this->homepageRankedEventQuery()
                ->where('events.is_featured', true)
                ->orderByDesc('events.is_featured')
                ->orderByDesc('events.is_trending')
                ->orderByDesc('recent_tickets_sold_count')
                ->orderByDesc('tickets_sold_count')
                ->orderByDesc('favorites_count')
                ->orderByDesc('events.views_count')
                ->orderByDesc('events.created_at')
                ->orderBy('events.starts_at')
                ->limit($limit)
                ->pluck('events.id')
                ->all())
        )));

        return Profiler::section('Featured homepageEventsByIds', fn () => $this->homepageEventsByIds($eventIds));
    }

    private function trendingEvents(Request $request)
    {
        $limit = Profiler::section('trendingEvents limit helper', fn (): int => $this->limit($request, 8, 'trending_limit'));

        $eventIds = Profiler::section('Cache::remember trending_event_ids', fn (): array => Cache::remember(HomepageCache::sectionKey('trending_event_ids', $limit), HomepageCache::ttl(), fn () => (
            Profiler::section('Trending ranked event id query pluck', fn (): array => $this->homepageRankedEventQuery()
                ->orderByDesc('recent_tickets_sold_count')
                ->orderByDesc('tickets_sold_count')
                ->orderByDesc('favorites_count')
                ->orderByDesc('events.views_count')
                ->orderBy('events.starts_at')
                ->limit($limit)
                ->pluck('events.id')
                ->all())
        )));

        return Profiler::section('Trending homepageEventsByIds', fn () => $this->homepageEventsByIds($eventIds));
    }

    private function upcomingEvents(Request $request)
    {
        $limit = Profiler::section('upcomingEvents limit helper', fn (): int => $this->limit($request, 8, 'upcoming_limit'));

        $eventIds = Profiler::section('Cache::remember upcoming_event_ids', fn (): array => Cache::remember(HomepageCache::sectionKey('upcoming_event_ids', $limit), HomepageCache::ttl(), fn () => (
            Profiler::section('Upcoming event id query pluck', fn (): array => $this->homepageEventResourceQuery()
                ->where('events.starts_at', '>=', now())
                ->orderBy('events.starts_at')
                ->limit($limit)
                ->pluck('events.id')
                ->all())
        )));

        return Profiler::section('Upcoming homepageEventsByIds', fn () => $this->homepageEventsByIds($eventIds));
    }

    private function categoryGroups(Request $request): array
    {
        $limit = Profiler::section('categoryGroups limit helper', fn (): int => $this->limit($request, 3, 'category_limit'));
        $cacheKey = HomepageCache::sectionKey('categories', $limit);

        return Profiler::section('Cache::remember homepage categories', fn (): array => Cache::remember($cacheKey, HomepageCache::ttl(), function () use ($limit, $request): array {
            $categories = Profiler::section('Load EventCategory collection', fn () => EventCategory::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get());

            $categoryValues = Profiler::section('Map category filter values', fn () => $categories->mapWithKeys(fn (EventCategory $category): array => [
                $category->id => $this->categoryFilterValues($category->slug ?: $category->name),
            ]));

            $values = Profiler::section('Flatten unique category values', fn (): array => $categoryValues
                ->flatten()
                ->unique()
                ->values()
                ->all());

            if ($values === []) {
                return [];
            }

            $ranked = Profiler::section('Build ranked category events subquery', fn () => Event::query()
                ->select('events.id')
                ->selectRaw('LOWER(events.category) as normalized_category')
                ->selectRaw('ROW_NUMBER() OVER (PARTITION BY LOWER(events.category) ORDER BY events.created_at DESC, events.starts_at ASC, events.id ASC) as category_rank')
                ->whereIn(DB::raw('LOWER(events.category)'), $values)
                ->publicDiscovery());

            $rankedRows = Profiler::section('Execute ranked category rows query', fn () => DB::query()
                ->fromSub($ranked, 'ranked_events')
                ->where('category_rank', '<=', $limit)
                ->get());

            $events = Profiler::section('Eager load category events by ranked ids', fn () => $this->homepageEventResourceQuery()
                ->whereKey($rankedRows->pluck('id')->all())
                ->get()
                ->keyBy('id'));

            $eventsByCategory = Profiler::section('Map/filter/group events by category', fn () => $rankedRows
                ->map(fn ($row) => [
                    'category' => $row->normalized_category,
                    'event' => $events->get($row->id),
                ])
                ->filter(fn (array $row): bool => $row['event'] instanceof Event)
                ->groupBy('category')
                ->map(fn ($rows) => $rows->pluck('event')));

            return Profiler::section('Transform category groups payload', fn (): array => $categories
                ->map(function (EventCategory $category) use ($categoryValues, $eventsByCategory, $limit, $request): ?array {
                    $events = Profiler::section('Category group event flatMap/sort/take', fn () => collect($categoryValues[$category->id] ?? [])
                        ->flatMap(fn (string $value) => $eventsByCategory->get($value, collect()))
                        ->unique('id')
                        ->sortBy([
                            ['created_at', 'desc'],
                            ['starts_at', 'asc'],
                        ])
                        ->take($limit)
                        ->values());

                    if ($events->isEmpty()) {
                        return null;
                    }

                    $resolvedEvents = Profiler::section('HomepageEventResource category resolve', fn (): array => HomepageEventResource::collection($events)->resolve($request));

                    return [
                        'id' => $category->id,
                        'name' => $category->name,
                        'slug' => $category->slug,
                        'icon' => $category->icon,
                        'events' => $resolvedEvents,
                    ];
                })
                ->filter()
                ->values()
                ->all());
        }));
    }

    private function featuredVenues(): array
    {
        return Profiler::section('Cache::remember featured_venues', fn (): array => Cache::remember(HomepageCache::sectionKey('featured_venues'), HomepageCache::ttl(), fn (): array => []));
    }

    private function popularVenues(): array
    {
        return Profiler::section('Cache::remember popular_venues', fn (): array => Cache::remember(HomepageCache::sectionKey('popular_venues'), HomepageCache::ttl(), fn (): array => []));
    }

    private function homepageRankedEventQuery(): Builder
    {
        return Profiler::section('Build homepage ranked event query', fn (): Builder => $this->homepageEventResourceQuery()
            ->withCount('favorites')
            ->withDiscoveryMetrics());
    }

    private function homepageEventResourceQuery(): Builder
    {
        return Profiler::section('Build homepage event resource query', fn (): Builder => Event::query()
            ->select([
                'events.id',
                'events.title',
                'events.slug',
                'events.category',
                'events.venue_name',
                'events.city',
                'events.country',
                'events.starts_at',
                'events.ends_at',
                'events.timezone',
                'events.status',
                'events.visibility',
                'events.banner_image_url',
                'events.base_price',
                'events.currency',
                'events.is_featured',
                'events.is_trending',
                'events.views_count',
                'events.created_at',
            ])
            ->with(['images:id,event_id,disk,path,url,type,is_primary,is_banner,sort_order'])
            ->withMin([
                'ticketTypes as price_from' => fn (Builder $query) => $query->where('status', 'active'),
            ], 'price')
            ->publicDiscovery());
    }

    private function limit(Request $request, int $default = 8, string $key = 'limit'): int
    {
        return Profiler::section("Limit helper {$key}", fn (): int => min(max((int) $request->integer($key, $request->integer('limit', $default)), 1), 12));
    }

    private function eventResponse($events): JsonResponse
    {
        return Profiler::section('Build event response JSON', fn (): JsonResponse => response()->json([
            'data' => Profiler::section('Event response eventsData', fn (): array => $this->eventsData($events, request())),
        ]));
    }

    private function eventsData($events, Request $request): array
    {
        return Profiler::section('HomepageEventResource collection resolve', fn (): array => HomepageEventResource::collection($events)->resolve($request));
    }

    private function homepageEventsByIds(array $eventIds)
    {
        if ($eventIds === []) {
            return collect();
        }

        $positions = Profiler::section('Build event id position map', fn (): array => array_flip($eventIds));

        return Profiler::section('Fetch/sort homepage events by ids', fn () => $this->homepageEventResourceQuery()
            ->whereKey($eventIds)
            ->get()
            ->sortBy(fn (Event $event): int => $positions[$event->id] ?? PHP_INT_MAX)
            ->values());
    }
}
