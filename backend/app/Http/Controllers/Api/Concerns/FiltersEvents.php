<?php

namespace App\Http\Controllers\Api\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait FiltersEvents
{
    protected function applyEventFilters(Builder $query, Request $request): Builder
    {
        $validated = $request->validated();

        $query
            ->when($validated['q'] ?? null, function (Builder $query, string $search): void {
                $needle = '%'.mb_strtolower($search).'%';

                $query->where(function (Builder $query) use ($needle): void {
                    $query
                        ->whereRaw('LOWER(title) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(category) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(venue_name) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(city) LIKE ?', [$needle])
                        ->orWhereHas('organizer', fn (Builder $query) => $query->whereRaw('LOWER(name) LIKE ?', [$needle]));
                });
            })
            ->when($validated['category'] ?? null, function (Builder $query, string $category): void {
                $categories = $this->categoryFilterValues($category);

                $query->where(function (Builder $query) use ($categories): void {
                    foreach ($categories as $index => $category) {
                        $method = $index === 0 ? 'whereRaw' : 'orWhereRaw';
                        $query->{$method}('LOWER(events.category) = ?', [$category]);
                    }
                });
            })
            ->when($validated['city'] ?? null, fn (Builder $query, string $city) => $query->where('city', $city))
            ->when($validated['date_from'] ?? null, fn (Builder $query, string $date) => $query->whereDate('starts_at', '>=', $date))
            ->when($validated['date_to'] ?? null, fn (Builder $query, string $date) => $query->whereDate('starts_at', '<=', $date))
            ->when(isset($validated['featured']), fn (Builder $query) => $query->where('is_featured', $validated['featured']))
            ->when(isset($validated['trending']), fn (Builder $query) => $query->where('is_trending', $validated['trending']))
            ->when(array_key_exists('min_price', $validated), fn (Builder $query) => $query->where('base_price', '>=', $validated['min_price']))
            ->when(array_key_exists('max_price', $validated), fn (Builder $query) => $query->where('base_price', '<=', $validated['max_price']));

        return match ($validated['sort'] ?? 'soonest') {
            'newest' => $query->latest(),
            'lowest_price' => $query->orderBy('base_price')->orderBy('starts_at'),
            'highest_price' => $query->orderByDesc('base_price')->orderBy('starts_at'),
            'trending' => $query
                ->orderByDesc('recent_tickets_sold_count')
                ->orderByDesc('tickets_sold_count')
                ->orderByDesc('favorites_count')
                ->orderByDesc('views_count')
                ->orderBy('starts_at'),
            default => $query->orderBy('starts_at'),
        };
    }

    protected function perPage(Request $request): int
    {
        return min((int) $request->integer('per_page', 12), 100);
    }

    /**
     * @return array<int, string>
     */
    protected function categoryFilterValues(string $category): array
    {
        $value = mb_strtolower(trim($category));
        if ($value === '') {
            return [];
        }

        $aliases = [
            'concert' => ['concert', 'concerts'],
            'concerts' => ['concerts', 'concert'],
            'festival' => ['festival', 'festivals'],
            'festivals' => ['festivals', 'festival'],
            'conference' => ['conference', 'conferences'],
            'conferences' => ['conferences', 'conference'],
            'sport' => ['sport', 'sports'],
            'sports' => ['sports', 'sport'],
            'theatre' => ['theatre', 'theater'],
            'theater' => ['theater', 'theatre'],
        ];

        return array_values(array_unique($aliases[$value] ?? [$value]));
    }
}
