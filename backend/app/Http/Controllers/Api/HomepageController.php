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

        return Cache::remember(HomepageCache::sectionKey('featured_events', $limit), HomepageCache::ttl(), fn () => (
            $this->homepageEventQuery()
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
                ->get()
        ));
    }

    private function trendingEvents(Request $request)
    {
        $limit = $this->limit($request, 8, 'trending_limit');

        return Cache::remember(HomepageCache::sectionKey('trending_events', $limit), HomepageCache::ttl(), fn () => (
            $this->homepageEventQuery()
                ->orderByDesc('recent_tickets_sold_count')
                ->orderByDesc('tickets_sold_count')
                ->orderByDesc('favorites_count')
                ->orderByDesc('events.views_count')
                ->orderBy('events.starts_at')
                ->limit($limit)
                ->get()
        ));
    }

    private function upcomingEvents(Request $request)
    {
        $limit = $this->limit($request, 8, 'upcoming_limit');

        return Cache::remember(HomepageCache::sectionKey('upcoming_events', $limit), HomepageCache::ttl(), fn () => (
            $this->homepageEventQuery()
                ->where('events.starts_at', '>=', now())
                ->orderBy('events.starts_at')
                ->limit($limit)
                ->get()
        ));
    }

    private function categoryGroups(Request $request): array
    {
        $limit = $this->limit($request, 3, 'category_limit');
        $cacheKey = HomepageCache::sectionKey('categories', $limit);

        return Cache::remember($cacheKey, HomepageCache::ttl(), function () use ($limit, $request): array {
            return EventCategory::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(function (EventCategory $category) use ($limit, $request): ?array {
                    $events = $this->homepageEventQuery()
                        ->where(function (Builder $query) use ($category): void {
                            foreach ($this->categoryFilterValues($category->slug ?: $category->name) as $index => $value) {
                                $method = $index === 0 ? 'whereRaw' : 'orWhereRaw';
                                $query->{$method}('LOWER(events.category) = ?', [$value]);
                            }
                        })
                        ->orderByDesc('events.created_at')
                        ->orderBy('events.starts_at')
                        ->limit($limit)
                        ->get();

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

    private function homepageEventQuery(): Builder
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
            ->with(['images:id,event_id,disk,path,url,is_primary,sort_order'])
            ->withMin([
                'ticketTypes as price_from' => fn (Builder $query) => $query->where('status', 'active'),
            ], 'price')
            ->withCount('favorites')
            ->withDiscoveryMetrics()
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
}
