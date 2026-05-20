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
                        ->orWhereRaw('LOWER(city) LIKE ?', [$needle]);
                });
            })
            ->when($validated['category'] ?? null, fn (Builder $query, string $category) => $query->where('category', $category))
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
            'trending' => $query->orderByDesc('is_trending')->orderByDesc('views_count')->orderBy('starts_at'),
            default => $query->orderBy('starts_at'),
        };
    }

    protected function perPage(Request $request): int
    {
        return min((int) $request->integer('per_page', 12), 100);
    }
}
