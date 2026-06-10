<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FiltersEvents;
use App\Http\Controllers\Controller;
use App\Http\Resources\HomepageEventResource;
use App\Models\Event;
use App\Models\EventCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class HomepageController extends Controller
{
    use FiltersEvents;

    public function featured(Request $request): JsonResponse
    {
        $events = $this->homepageEventQuery()
            ->where('events.is_featured', true)
            ->orderByDesc('events.is_featured')
            ->orderByDesc('events.is_trending')
            ->orderByDesc('recent_tickets_sold_count')
            ->orderByDesc('tickets_sold_count')
            ->orderByDesc('favorites_count')
            ->orderByDesc('events.views_count')
            ->orderByDesc('events.created_at')
            ->orderBy('events.starts_at')
            ->limit($this->limit($request))
            ->get();

        return $this->eventResponse($events);
    }

    public function trending(Request $request): JsonResponse
    {
        $events = $this->homepageEventQuery()
            ->orderByDesc('recent_tickets_sold_count')
            ->orderByDesc('tickets_sold_count')
            ->orderByDesc('favorites_count')
            ->orderByDesc('events.views_count')
            ->orderBy('events.starts_at')
            ->limit($this->limit($request))
            ->get();

        return $this->eventResponse($events);
    }

    public function upcoming(Request $request): JsonResponse
    {
        $events = $this->homepageEventQuery()
            ->where('events.starts_at', '>=', now())
            ->orderBy('events.starts_at')
            ->limit($this->limit($request))
            ->get();

        return $this->eventResponse($events);
    }

    public function recommendations(Request $request): JsonResponse
    {
        $events = $this->homepageEventQuery()
            ->orderByDesc('recent_tickets_sold_count')
            ->orderByDesc('tickets_sold_count')
            ->orderByDesc('favorites_count')
            ->orderByDesc('events.views_count')
            ->orderBy('events.starts_at')
            ->limit($this->limit($request))
            ->get();

        return $this->eventResponse($events);
    }

    public function categories(Request $request): JsonResponse
    {
        $limit = $this->limit($request, 3);
        $cacheKey = "homepage.categories.v1.{$limit}";

        $categories = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($limit, $request): array {
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

        return response()->json(['data' => $categories]);
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

    private function limit(Request $request, int $default = 8): int
    {
        return min(max((int) $request->integer('limit', $default), 1), 12);
    }

    private function eventResponse($events): JsonResponse
    {
        return response()->json([
            'data' => HomepageEventResource::collection($events)->resolve(request()),
        ]);
    }
}
