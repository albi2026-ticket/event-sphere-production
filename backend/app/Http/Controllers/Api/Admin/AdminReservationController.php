<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReservationResource;
use App\Models\AuditLog;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminReservationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => ['sometimes', Rule::in([
                Reservation::STATUS_PENDING,
                Reservation::STATUS_CONFIRMED,
                Reservation::STATUS_COMPLETED,
                Reservation::STATUS_CANCELLED,
                Reservation::STATUS_NO_SHOW,
            ])],
            'venue_id' => ['sometimes', 'integer', Rule::exists(Venue::class, 'id')],
            'owner_id' => ['sometimes', 'integer', Rule::exists(User::class, 'id')],
            'city' => ['sometimes', 'string', 'max:255'],
            'date_from' => ['sometimes', 'date_format:Y-m-d'],
            'date_to' => ['sometimes', 'date_format:Y-m-d'],
            'q' => ['sometimes', 'string', 'max:255'],
            'with_archived' => ['sometimes', 'boolean'],
            'only_archived' => ['sometimes', 'boolean'],
        ]);

        $query = Reservation::query()
            ->with(['venue.owner', 'user'])
            ->latest();

        if ($request->boolean('only_archived')) {
            $query->onlyTrashed();
        } elseif ($request->boolean('with_archived')) {
            $query->withTrashed();
        }

        $this->applyFilters($query, $validated);

        return ReservationResource::collection($query->paginate($request->integer('per_page', 15)))
            ->additional(['meta' => $this->meta($validated)]);
    }

    public function show(Reservation $reservation): JsonResponse
    {
        $reservation->load(['venue.owner', 'user']);
        $payload = (new ReservationResource($reservation))->resolve(request());
        $payload['audit_history'] = $this->auditHistory($reservation);

        return response()->json(['data' => $payload]);
    }

    public function confirm(Request $request, Reservation $reservation): ReservationResource
    {
        $this->ensureTransition($reservation, [Reservation::STATUS_PENDING], 'Only pending reservations can be confirmed.');

        $reservation->update(['status' => Reservation::STATUS_CONFIRMED]);
        AuditLog::record($request->user(), 'reservation.confirmed', $reservation, [
            'guest_name' => $reservation->guest_name,
            'label' => 'Confirmed by Admin',
        ], $request->ip());

        return new ReservationResource($reservation->fresh(['venue.owner', 'user']));
    }

    public function cancel(Request $request, Reservation $reservation): ReservationResource
    {
        $validated = $request->validate([
            'cancellation_reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $this->ensureTransition($reservation, [Reservation::STATUS_PENDING, Reservation::STATUS_CONFIRMED], 'Only pending or confirmed reservations can be cancelled.');

        $reservation->update([
            'status' => Reservation::STATUS_CANCELLED,
            'cancellation_reason' => $validated['cancellation_reason'] ?? $reservation->cancellation_reason,
            'cancelled_at' => now(),
        ]);
        AuditLog::record($request->user(), 'reservation.cancelled', $reservation, [
            'guest_name' => $reservation->guest_name,
            'reason' => $validated['cancellation_reason'] ?? null,
            'label' => 'Cancelled by Admin',
        ], $request->ip());

        return new ReservationResource($reservation->fresh(['venue.owner', 'user']));
    }

    public function complete(Request $request, Reservation $reservation): ReservationResource
    {
        $this->ensureTransition($reservation, [Reservation::STATUS_CONFIRMED], 'Only confirmed reservations can be marked completed.');

        $reservation->update(['status' => Reservation::STATUS_COMPLETED]);
        AuditLog::record($request->user(), 'reservation.completed', $reservation, [
            'guest_name' => $reservation->guest_name,
            'label' => 'Completed by Admin',
        ], $request->ip());

        return new ReservationResource($reservation->fresh(['venue.owner', 'user']));
    }

    public function noShow(Request $request, Reservation $reservation): ReservationResource
    {
        $this->ensureTransition($reservation, [Reservation::STATUS_CONFIRMED], 'Only confirmed reservations can be marked no show.');

        $reservation->update(['status' => Reservation::STATUS_NO_SHOW]);
        AuditLog::record($request->user(), 'reservation.no_show', $reservation, [
            'guest_name' => $reservation->guest_name,
            'label' => 'Marked No Show by Admin',
        ], $request->ip());

        return new ReservationResource($reservation->fresh(['venue.owner', 'user']));
    }

    public function destroy(Request $request, Reservation $reservation): JsonResponse
    {
        AuditLog::record($request->user(), 'reservation.archived', $reservation, ['guest_name' => $reservation->guest_name], $request->ip());
        $reservation->delete();

        return response()->json(['message' => 'Reservation archived.']);
    }

    public function restore(Request $request, int $reservation): ReservationResource
    {
        $reservation = Reservation::withTrashed()->findOrFail($reservation);
        $reservation->restore();

        AuditLog::record($request->user(), 'reservation.restored', $reservation, ['guest_name' => $reservation->guest_name], $request->ip());

        return new ReservationResource($reservation->fresh(['venue.owner', 'user']));
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    protected function applyFilters(Builder $query, array $filters): void
    {
        $query
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['venue_id'] ?? null, fn (Builder $query, int $venueId) => $query->where('venue_id', $venueId))
            ->when($filters['owner_id'] ?? null, fn (Builder $query, int $ownerId) => $query->whereHas('venue', fn (Builder $query) => $query->where('user_id', $ownerId)))
            ->when($filters['city'] ?? null, fn (Builder $query, string $city) => $query->whereHas('venue', fn (Builder $query) => $query->where('city', 'like', "%{$city}%")))
            ->when($filters['date_from'] ?? null, fn (Builder $query, string $date) => $query->whereDate('reservation_date', '>=', $date))
            ->when($filters['date_to'] ?? null, fn (Builder $query, string $date) => $query->whereDate('reservation_date', '<=', $date))
            ->when($filters['q'] ?? null, fn (Builder $query, string $q) => $query->where(function (Builder $query) use ($q): void {
                $query->when(is_numeric($q), fn (Builder $query) => $query->orWhere('id', (int) $q))
                    ->orWhere('guest_name', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhereHas('user', fn (Builder $query) => $query
                        ->where('name', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%"))
                    ->orWhereHas('venue', fn (Builder $query) => $query
                        ->where('name', 'like', "%{$q}%")
                        ->orWhere('city', 'like', "%{$q}%")
                        ->orWhereHas('owner', fn (Builder $query) => $query
                            ->where('name', 'like', "%{$q}%")
                            ->orWhere('email', 'like', "%{$q}%")));
            }));
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function meta(array $filters): array
    {
        $filtered = Reservation::query()->with('venue.owner');
        $this->applyFilters($filtered, $filters);
        $all = Reservation::query();

        return [
            'stats' => $this->stats(clone $filtered),
            'platform' => [
                'today' => (clone $all)->whereDate('reservation_date', today())->count(),
                'this_month' => (clone $all)->whereBetween('reservation_date', [today()->startOfMonth()->toDateString(), today()->endOfMonth()->toDateString()])->count(),
                'top_venues' => $this->topVenues(),
                'top_cities' => $this->topCities(),
            ],
        ];
    }

    /**
     * @return array<string, int>
     */
    protected function stats(Builder $query): array
    {
        return [
            'total' => (clone $query)->count(),
            'pending' => (clone $query)->where('status', Reservation::STATUS_PENDING)->count(),
            'confirmed' => (clone $query)->where('status', Reservation::STATUS_CONFIRMED)->count(),
            'completed' => (clone $query)->where('status', Reservation::STATUS_COMPLETED)->count(),
            'cancelled' => (clone $query)->where('status', Reservation::STATUS_CANCELLED)->count(),
            'no_show' => (clone $query)->where('status', Reservation::STATUS_NO_SHOW)->count(),
        ];
    }

    /**
     * @return array<int, array{name: string, total: int}>
     */
    protected function topVenues(): array
    {
        return Venue::query()
            ->withCount('reservations')
            ->orderByDesc('reservations_count')
            ->limit(5)
            ->get()
            ->map(fn (Venue $venue): array => [
                'name' => $venue->name,
                'total' => (int) $venue->reservations_count,
            ])
            ->all();
    }

    /**
     * @return array<int, array{city: string, total: int}>
     */
    protected function topCities(): array
    {
        return Reservation::query()
            ->join('venues', 'reservations.venue_id', '=', 'venues.id')
            ->selectRaw('venues.city as city, count(*) as total')
            ->whereNotNull('venues.city')
            ->groupBy('venues.city')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn ($row): array => [
                'city' => (string) $row->city,
                'total' => (int) $row->total,
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function auditHistory(Reservation $reservation): array
    {
        $history = [[
            'label' => 'Reservation Created',
            'timestamp' => $reservation->created_at?->toIso8601String(),
            'actor' => $reservation->user?->name ?? 'Guest',
            'action' => 'reservation.created',
        ]];

        $logs = AuditLog::query()
            ->with('user')
            ->where('auditable_type', Reservation::class)
            ->where('auditable_id', $reservation->id)
            ->orderBy('created_at')
            ->get();

        foreach ($logs as $log) {
            $history[] = [
                'label' => $log->metadata['label'] ?? Str::headline(str_replace('.', ' ', $log->action)),
                'timestamp' => $log->created_at?->toIso8601String(),
                'actor' => $log->user?->name ?? 'System',
                'action' => $log->action,
                'metadata' => $log->metadata,
            ];
        }

        return $history;
    }

    /**
     * @param  array<int, string>  $allowedStatuses
     */
    protected function ensureTransition(Reservation $reservation, array $allowedStatuses, string $message): void
    {
        abort_unless(in_array($reservation->status, $allowedStatuses, true), 422, $message);
    }
}
