<?php

namespace App\Http\Controllers\Api\Owner;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Venue;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class OwnerAnalyticsController extends Controller
{
    private const SUMMARY_TTL_SECONDS = 45;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['sometimes', 'date_format:Y-m-d'],
            'end_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'venue_id' => ['sometimes', 'integer', Rule::exists(Venue::class, 'id')],
        ]);

        $startDate = isset($validated['start_date'])
            ? Carbon::parse($validated['start_date'])->startOfDay()
            : today()->subDays(29)->startOfDay();
        $endDate = isset($validated['end_date'])
            ? Carbon::parse($validated['end_date'])->endOfDay()
            : today()->endOfDay();

        abort_if($startDate->diffInDays($endDate) > 370, 422, 'Analytics date range cannot exceed 370 days.');

        if (isset($validated['venue_id'])) {
            $venue = Venue::query()->findOrFail($validated['venue_id']);
            abort_unless((int) $venue->user_id === (int) $request->user()->id, 403);
        }

        $cacheKey = sprintf(
            'dashboard:owner:analytics:%d:%s',
            $request->user()->id,
            md5(json_encode([
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'venue_id' => $validated['venue_id'] ?? null,
            ]) ?: ''),
        );

        $data = Cache::remember($cacheKey, now()->addSeconds(self::SUMMARY_TTL_SECONDS), function () use ($request, $validated, $startDate, $endDate): array {
            $periodQuery = $this->ownedReservations($request)
                ->whereBetween('reservation_date', [$startDate->toDateString(), $endDate->toDateString()]);

            if (isset($validated['venue_id'])) {
                $periodQuery->where('venue_id', $validated['venue_id']);
            }

            $todayQuery = $this->ownedReservations($request)->whereDate('reservation_date', today());
            $monthQuery = $this->ownedReservations($request)
                ->whereBetween('reservation_date', [today()->startOfMonth()->toDateString(), today()->endOfMonth()->toDateString()]);

            if (isset($validated['venue_id'])) {
                $todayQuery->where('venue_id', $validated['venue_id']);
                $monthQuery->where('venue_id', $validated['venue_id']);
            }

            $overview = $this->countsByStatus(clone $periodQuery);
            $today = $this->performanceCounts(clone $todayQuery);
            $month = $this->performanceCounts(clone $monthQuery);

            return [
                'period' => [
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                ],
                'overview' => $overview,
                'today' => $today,
                'month' => $month,
                'rates' => $this->rates($overview),
                'trend' => $this->trend(clone $periodQuery, $startDate, $endDate),
                'status_breakdown' => $this->statusBreakdown($overview),
                'top_days' => $this->topDays(clone $periodQuery),
                'top_time_slots' => $this->topTimeSlots(clone $periodQuery),
            ];
        });

        return response()->json([
            'data' => $data,
        ]);
    }

    protected function ownedReservations(Request $request): Builder
    {
        return Reservation::query()
            ->whereHas('venue', fn (Builder $query) => $query->where('user_id', $request->user()->id));
    }

    /**
     * @return array<string, int>
     */
    protected function countsByStatus(Builder $query): array
    {
        $counts = (clone $query)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'total' => (int) $counts->sum(),
            'pending' => (int) ($counts[Reservation::STATUS_PENDING] ?? 0),
            'confirmed' => (int) ($counts[Reservation::STATUS_CONFIRMED] ?? 0),
            'completed' => (int) ($counts[Reservation::STATUS_COMPLETED] ?? 0),
            'cancelled' => (int) ($counts[Reservation::STATUS_CANCELLED] ?? 0),
            'no_show' => (int) ($counts[Reservation::STATUS_NO_SHOW] ?? 0),
        ];
    }

    /**
     * @return array<string, int>
     */
    protected function performanceCounts(Builder $query): array
    {
        $counts = (clone $query)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'reservations' => (int) $counts->sum(),
            'completed' => (int) ($counts[Reservation::STATUS_COMPLETED] ?? 0),
            'cancelled' => (int) ($counts[Reservation::STATUS_CANCELLED] ?? 0),
            'no_show' => (int) ($counts[Reservation::STATUS_NO_SHOW] ?? 0),
        ];
    }

    /**
     * @param  array<string, int>  $overview
     * @return array<string, int>
     */
    protected function rates(array $overview): array
    {
        $total = max(0, $overview['total']);
        $confirmed = max(0, $overview['confirmed']);

        return [
            'completion_rate' => $total > 0 ? (int) round(($overview['completed'] / $total) * 100) : 0,
            'cancellation_rate' => $total > 0 ? (int) round(($overview['cancelled'] / $total) * 100) : 0,
            'no_show_rate' => $confirmed > 0 ? (int) round(($overview['no_show'] / $confirmed) * 100) : 0,
        ];
    }

    /**
     * @return array<int, array{date: string, total: int}>
     */
    protected function trend(Builder $query, Carbon $startDate, Carbon $endDate): array
    {
        $counts = (clone $query)
            ->selectRaw('reservation_date, count(*) as total')
            ->groupBy('reservation_date')
            ->pluck('total', 'reservation_date')
            ->all();

        $items = [];
        foreach (CarbonPeriod::create($startDate->toDateString(), $endDate->toDateString()) as $date) {
            $key = $date->format('Y-m-d');
            $items[] = [
                'date' => $key,
                'total' => (int) ($counts[$key] ?? 0),
            ];
        }

        return $items;
    }

    /**
     * @param  array<string, int>  $overview
     * @return array<int, array{status: string, total: int}>
     */
    protected function statusBreakdown(array $overview): array
    {
        return collect([
            Reservation::STATUS_PENDING,
            Reservation::STATUS_CONFIRMED,
            Reservation::STATUS_COMPLETED,
            Reservation::STATUS_CANCELLED,
            Reservation::STATUS_NO_SHOW,
        ])->map(fn (string $status): array => [
            'status' => $status,
            'total' => (int) ($overview[$status] ?? 0),
        ])->all();
    }

    /**
     * @return array<int, array{day: string, total: int}>
     */
    protected function topDays(Builder $query): array
    {
        $labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return (clone $query)
            ->selectRaw('reservation_date, count(*) as total')
            ->groupBy('reservation_date')
            ->get()
            ->groupBy(fn (Reservation $reservation): string => $labels[(int) Carbon::parse($reservation->reservation_date)->dayOfWeek])
            ->map(fn ($items, string $day): array => ['day' => $day, 'total' => (int) $items->sum('total')])
            ->sortByDesc('total')
            ->take(5)
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{time: string, total: int}>
     */
    protected function topTimeSlots(Builder $query): array
    {
        return (clone $query)
            ->selectRaw('reservation_time, count(*) as total')
            ->groupBy('reservation_time')
            ->orderByDesc('total')
            ->orderBy('reservation_time')
            ->limit(8)
            ->get()
            ->map(fn (Reservation $reservation): array => [
                'time' => substr((string) $reservation->reservation_time, 0, 5),
                'total' => (int) $reservation->total,
            ])
            ->all();
    }
}
