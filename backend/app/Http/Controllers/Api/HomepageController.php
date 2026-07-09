<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FiltersEvents;
use App\Http\Controllers\Controller;
use App\Http\Resources\HomepageEventResource;
use App\Models\Event;
use App\Models\EventCategory;
use App\Support\HomepageCache;
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
        $limits = [
            'featured_limit' => $this->limit($request, 8, 'featured_limit'),
            'trending_limit' => $this->limit($request, 8, 'trending_limit'),
            'upcoming_limit' => $this->limit($request, 8, 'upcoming_limit'),
            'category_limit' => $this->limit($request, 3, 'category_limit'),
        ];

        $data = Cache::remember(HomepageCache::endpointKey($limits), HomepageCache::ttl(), function () use ($request): array {
            $featured = $this->featuredEvents($request);
            $trending = $this->trendingEvents($request);
            $upcoming = $this->upcomingEvents($request);
            $categories = $this->categoryGroups($request);

            return [
                'featured_events' => $this->eventsData($featured, $request),
                'trending_events' => $this->eventsData($trending, $request),
                'upcoming_events' => $this->eventsData($upcoming, $request),
                'categories' => $categories,
                'featured_venues' => $this->featuredVenues(),
                'popular_venues' => $this->popularVenues(),
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function featured(Request $request): JsonResponse
    {
        return $this->eventResponse($this->featuredEvents($request));
    }

    public function trending(Request $request): JsonResponse
    {
        return $this->eventResponse($this->trendingEvents($request));
    }

    public function upcoming(Request $request): JsonResponse
    {
        return $this->eventResponse($this->upcomingEvents($request));
    }

    public function recommendations(Request $request): JsonResponse
    {
        return $this->eventResponse($this->trendingEvents($request));
    }

    public function categories(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->categoryGroups($request)]);
    }

    private function featuredEvents(Request $request)
    {
        $limit = $this->limit($request, 8, 'featured_limit');

        $eventIds = Cache::remember(HomepageCache::sectionKey('featured_event_ids', $limit), HomepageCache::ttl(), fn () => (
            $this->homepageRankedEventQuery()
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
                ->all()
        ));

        return $this->homepageEventsByIds($eventIds);
    }

    private function trendingEvents(Request $request)
    {
        $limit = $this->limit($request, 8, 'trending_limit');

        $eventIds = Cache::remember(HomepageCache::sectionKey('trending_event_ids', $limit), HomepageCache::ttl(), fn () => (
            $this->homepageRankedEventQuery()
                ->orderByDesc('recent_tickets_sold_count')
                ->orderByDesc('tickets_sold_count')
                ->orderByDesc('favorites_count')
                ->orderByDesc('events.views_count')
                ->orderBy('events.starts_at')
                ->limit($limit)
                ->pluck('events.id')
                ->all()
        ));

        return $this->homepageEventsByIds($eventIds);
    }

    private function upcomingEvents(Request $request)
    {
        $limit = $this->limit($request, 8, 'upcoming_limit');

        $eventIds = Cache::remember(HomepageCache::sectionKey('upcoming_event_ids', $limit), HomepageCache::ttl(), fn () => (
            $this->homepageEventResourceQuery()
                ->where('events.starts_at', '>=', now())
                ->orderBy('events.starts_at')
                ->limit($limit)
                ->pluck('events.id')
                ->all()
        ));

        return $this->homepageEventsByIds($eventIds);
    }

    private function categoryGroups(Request $request): array
    {
        $limit = $this->limit($request, 3, 'category_limit');
        $cacheKey = HomepageCache::sectionKey('categories', $limit);

        return Cache::remember($cacheKey, HomepageCache::ttl(), function () use ($limit, $request): array {
            $categories = EventCategory::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();

            $categoryValues = $categories->mapWithKeys(fn (EventCategory $category): array => [
                $category->id => $this->categoryFilterValues($category->slug ?: $category->name),
            ]);

            $values = $categoryValues
                ->flatten()
                ->unique()
                ->values()
                ->all();

            if ($values === []) {
                return [];
            }

            $ranked = Event::query()
                ->select('events.id')
                ->selectRaw('LOWER(events.category) as normalized_category')
                ->selectRaw('ROW_NUMBER() OVER (PARTITION BY LOWER(events.category) ORDER BY events.created_at DESC, events.starts_at ASC, events.id ASC) as category_rank')
                ->whereIn(DB::raw('LOWER(events.category)'), $values)
                ->publicDiscovery();

            $rankedRows = DB::query()
                ->fromSub($ranked, 'ranked_events')
                ->where('category_rank', '<=', $limit)
                ->get();

            $events = $this->homepageEventResourceQuery()
                ->whereKey($rankedRows->pluck('id')->all())
                ->get()
                ->keyBy('id');

            $eventsByCategory = $rankedRows
                ->map(fn ($row) => [
                    'category' => $row->normalized_category,
                    'event' => $events->get($row->id),
                ])
                ->filter(fn (array $row): bool => $row['event'] instanceof Event)
                ->groupBy('category')
                ->map(fn ($rows) => $rows->pluck('event'));

            return $categories
                ->map(function (EventCategory $category) use ($categoryValues, $eventsByCategory, $limit, $request): ?array {
                    $events = collect($categoryValues[$category->id] ?? [])
                        ->flatMap(fn (string $value) => $eventsByCategory->get($value, collect()))
                        ->unique('id')
                        ->sortBy([
                            ['created_at', 'desc'],
                            ['starts_at', 'asc'],
                        ])
                        ->take($limit)
                        ->values();

                    if ($events->isEmpty()) {
                        return null;
                    }

                    return [
                        'id' => $category->id,
                        'name' => $category->name,
                        'slug' => $category->slug,
                        'icon' => $category->icon,
                        'events' => HomepageEventResource::collection($events)->resolve($request),
                    ];
                })
                ->filter()
                ->values()
                ->all();
        });
    }

    private function featuredVenues(): array
    {
        return Cache::remember(HomepageCache::sectionKey('featured_venues'), HomepageCache::ttl(), fn (): array => []);
    }

    private function popularVenues(): array
    {
        return Cache::remember(HomepageCache::sectionKey('popular_venues'), HomepageCache::ttl(), fn (): array => []);
    }

    private function homepageRankedEventQuery(): Builder
    {
        return $this->homepageEventResourceQuery()
            ->withCount('favorites')
            ->withDiscoveryMetrics();
    }

    private function homepageEventResourceQuery(): Builder
    {
        return Event::query()
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
            ->publicDiscovery();
    }

    private function limit(Request $request, int $default = 8, string $key = 'limit'): int
    {
        return min(max((int) $request->integer($key, $request->integer('limit', $default)), 1), 12);
    }

    private function eventResponse($events): JsonResponse
    {
        return response()->json([
            'data' => $this->eventsData($events, request()),
        ]);
    }

    private function eventsData($events, Request $request): array
    {
        return HomepageEventResource::collection($events)->resolve($request);
    }

    private function homepageEventsByIds(array $eventIds)
    {
        if ($eventIds === []) {
            return collect();
        }

        $positions = array_flip($eventIds);

        return $this->homepageEventResourceQuery()
            ->whereKey($eventIds)
            ->get()
            ->sortBy(fn (Event $event): int => $positions[$event->id] ?? PHP_INT_MAX)
            ->values();
    }
}
