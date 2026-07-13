<?php

namespace App\Http\Controllers\Api\Owner;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReservationResource;
use App\Mail\ReservationCancelledMail;
use App\Mail\ReservationCompletedMail;
use App\Mail\ReservationConfirmedMail;
use App\Mail\ReservationNoShowMail;
use App\Models\Notification;
use App\Models\Reservation;
use App\Models\Venue;
use App\Services\Notifications\NotificationService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class OwnerReservationController extends Controller
{
    private const SUMMARY_TTL_SECONDS = 45;

    private const CALENDAR_STATUSES = [
        Reservation::STATUS_PENDING,
        Reservation::STATUS_CONFIRMED,
        Reservation::STATUS_COMPLETED,
        Reservation::STATUS_CANCELLED,
        Reservation::STATUS_NO_SHOW,
    ];

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->ensureVerifiedOwner($request);

        $query = $this->ownedReservations($request)
            ->with(['venue', 'user']);

        $this->applyFilters($query, $request);

        return ReservationResource::collection(
            $query->orderByDesc('created_at')
                ->orderByDesc('id')
                ->paginate($request->integer('per_page', 15)),
        )->additional(['meta' => ['stats' => $this->stats($request)]]);
    }

    public function calendar(Request $request): AnonymousResourceCollection
    {
        $payload = $request->validate([
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'status' => ['sometimes', Rule::in(self::CALENDAR_STATUSES)],
            'venue_id' => ['sometimes', 'integer', Rule::exists(Venue::class, 'id')],
        ]);

        $startDate = $payload['start_date'];
        $endDate = $payload['end_date'];

        abort_if(
            Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate)) > 62,
            422,
            __('validation.custom.calendar_range_limit'),
        );

        $query = $this->ownedReservations($request)
            ->with(['venue', 'user'])
            ->whereDate('reservation_date', '>=', $startDate)
            ->whereDate('reservation_date', '<=', $endDate);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('venue_id')) {
            $query->where('venue_id', $request->integer('venue_id'));
        }

        return ReservationResource::collection(
            $query->orderByDesc('created_at')
                ->orderByDesc('id')
                ->get(),
        )->additional(['meta' => [
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'today_summary' => $this->todaySummary($request),
        ]]);
    }

    public function show(Request $request, Reservation $reservation): ReservationResource
    {
        $this->ensureVerifiedOwner($request);
        $this->authorizeOwner($request, $reservation);

        return new ReservationResource($reservation->load(['venue.images', 'user']));
    }

    public function confirm(Request $request, Reservation $reservation): ReservationResource
    {
        $this->ensureVerifiedOwner($request);
        $this->authorizeOwner($request, $reservation);
        $this->ensureTransition($reservation, [Reservation::STATUS_PENDING], __('validation.custom.only_pending_confirmed'));

        $reservation->update(['status' => Reservation::STATUS_CONFIRMED]);
        $reservation = $reservation->fresh(['venue.images', 'user']);

        Mail::to($reservation->user->email, $reservation->guest_name)
            ->locale($reservation->user->preferred_language ?: 'en')
            ->queue(new ReservationConfirmedMail($reservation));

        if ($reservation->user) {
            app(NotificationService::class)->create(
                $reservation->user,
                Notification::TYPE_RESERVATION_CONFIRMED,
                __('notifications.reservation_confirmed', [], $reservation->user->preferred_language ?: 'en'),
                __('notifications.reservation_confirmed_message', ['venue' => $reservation->venue->name], $reservation->user->preferred_language ?: 'en'),
                '/site/my-reservations.html',
            );
        }

        return new ReservationResource($reservation);
    }

    public function cancel(Request $request, Reservation $reservation): ReservationResource
    {
        $this->ensureVerifiedOwner($request);
        $this->authorizeOwner($request, $reservation);
        $this->ensureTransition($reservation, [Reservation::STATUS_PENDING, Reservation::STATUS_CONFIRMED], __('validation.custom.only_pending_confirmed_cancelled'));
        $payload = $request->validate([
            'owner_cancellation_reason' => ['required', 'string', 'max:1000'],
        ]);

        $reservation->update([
            'status' => Reservation::STATUS_CANCELLED,
            'owner_cancellation_reason' => $payload['owner_cancellation_reason'],
            'cancelled_at' => now(),
        ]);
        $reservation = $reservation->fresh(['venue.images', 'user']);

        Mail::to($reservation->user->email, $reservation->guest_name)
            ->locale($reservation->user->preferred_language ?: 'en')
            ->queue(new ReservationCancelledMail($reservation));

        if ($reservation->user) {
            app(NotificationService::class)->create(
                $reservation->user,
                Notification::TYPE_RESERVATION_CANCELLED,
                __('notifications.reservation_cancelled', [], $reservation->user->preferred_language ?: 'en'),
                __('notifications.reservation_cancelled_reason_message', [
                    'venue' => $reservation->venue->name,
                    'reason' => $reservation->owner_cancellation_reason,
                ], $reservation->user->preferred_language ?: 'en'),
                '/site/my-reservations.html',
            );
        }

        return new ReservationResource($reservation);
    }

    public function complete(Request $request, Reservation $reservation): ReservationResource
    {
        $this->ensureVerifiedOwner($request);
        $this->authorizeOwner($request, $reservation);
        $this->ensureTransition($reservation, [Reservation::STATUS_CONFIRMED], __('validation.custom.only_confirmed_completed'));

        $reservation->update(['status' => Reservation::STATUS_COMPLETED]);
        $reservation = $reservation->fresh(['venue.images', 'user']);

        Mail::to($reservation->user->email, $reservation->guest_name)
            ->locale($reservation->user->preferred_language ?: 'en')
            ->queue(new ReservationCompletedMail($reservation));

        if ($reservation->user) {
            app(NotificationService::class)->create(
                $reservation->user,
                Notification::TYPE_RESERVATION_COMPLETED,
                __('notifications.reservation_completed', [], $reservation->user->preferred_language ?: 'en'),
                __('notifications.reservation_completed_message', ['venue' => $reservation->venue->name], $reservation->user->preferred_language ?: 'en'),
                '/site/my-reservations.html',
            );
        }

        return new ReservationResource($reservation);
    }

    public function noShow(Request $request, Reservation $reservation): ReservationResource
    {
        $this->ensureVerifiedOwner($request);
        $this->authorizeOwner($request, $reservation);
        $this->ensureTransition($reservation, [Reservation::STATUS_CONFIRMED], __('validation.custom.only_confirmed_no_show'));

        $reservation->update(['status' => Reservation::STATUS_NO_SHOW]);
        $reservation = $reservation->fresh(['venue.images', 'user']);

        Mail::to($reservation->user->email, $reservation->guest_name)
            ->locale($reservation->user->preferred_language ?: 'en')
            ->queue(new ReservationNoShowMail($reservation));

        if ($reservation->user) {
            app(NotificationService::class)->create(
                $reservation->user,
                Notification::TYPE_RESERVATION_NO_SHOW,
                __('notifications.reservation_no_show', [], $reservation->user->preferred_language ?: 'en'),
                __('notifications.reservation_no_show_message', ['venue' => $reservation->venue->name], $reservation->user->preferred_language ?: 'en'),
                '/site/my-reservations.html',
            );
        }

        return new ReservationResource($reservation);
    }

    protected function ownedReservations(Request $request): Builder
    {
        return Reservation::query()
            ->when(! $request->user()->isAdmin(), fn (Builder $query) => $query
                ->whereHas('venue', fn (Builder $query) => $query->where('user_id', $request->user()->id)));
    }

    protected function authorizeOwner(Request $request, Reservation $reservation): void
    {
        $reservation->loadMissing('venue');

        abort_unless(
            $request->user()->isAdmin()
                || $request->user()->canManageVenue($reservation->venue),
            403,
        );
    }

    protected function ensureVerifiedOwner(Request $request): void
    {
        abort_unless(
            $request->user()?->hasVerifiedEmail(),
            403,
            __('validation.custom.verify_email_venue'),
        );
    }

    protected function applyFilters(Builder $query, Request $request): void
    {
        $request->validate([
            'status' => ['sometimes', Rule::in([
                Reservation::STATUS_PENDING,
                Reservation::STATUS_CONFIRMED,
                Reservation::STATUS_COMPLETED,
                Reservation::STATUS_CANCELLED,
                Reservation::STATUS_NO_SHOW,
            ])],
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'venue_id' => ['sometimes', 'integer', Rule::exists(Venue::class, 'id')],
            'view' => ['sometimes', Rule::in(['today', 'upcoming', 'completed', 'cancelled'])],
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('date')) {
            $query->whereDate('reservation_date', $request->string('date')->toString());
        }

        if ($request->filled('venue_id')) {
            $query->where('venue_id', $request->integer('venue_id'));
        }

        match ($request->string('view')->toString()) {
            'today' => $query->whereDate('reservation_date', today()),
            'upcoming' => $query
                ->whereIn('status', [Reservation::STATUS_PENDING, Reservation::STATUS_CONFIRMED])
                ->whereDate('reservation_date', '>=', today()),
            'completed' => $query->where('status', Reservation::STATUS_COMPLETED),
            'cancelled' => $query->where('status', Reservation::STATUS_CANCELLED),
            default => null,
        };
    }

    /**
     * @return array<string, int>
     */
    protected function stats(Request $request): array
    {
        return Cache::remember($this->summaryCacheKey($request, 'stats'), now()->addSeconds(self::SUMMARY_TTL_SECONDS), function () use ($request): array {
            $base = $this->ownedReservations($request);
            $today = today();
            $rows = (clone $base)
                ->selectRaw(
                    'status,
                    count(*) as total,
                    SUM(CASE WHEN reservation_date = ? THEN 1 ELSE 0 END) as today_total,
                    SUM(CASE WHEN status IN (?, ?) AND reservation_date >= ? THEN 1 ELSE 0 END) as upcoming_total',
                    [
                        $today->toDateString(),
                        Reservation::STATUS_PENDING,
                        Reservation::STATUS_CONFIRMED,
                        $today->toDateString(),
                    ],
                )
                ->groupBy('status')
                ->get();
            $counts = $rows->pluck('total', 'status');

            return [
                'pending' => (int) ($counts[Reservation::STATUS_PENDING] ?? 0),
                'confirmed' => (int) ($counts[Reservation::STATUS_CONFIRMED] ?? 0),
                'today' => (int) $rows->sum('today_total'),
                'upcoming' => (int) $rows->sum('upcoming_total'),
                'completed' => (int) ($counts[Reservation::STATUS_COMPLETED] ?? 0),
                'cancelled' => (int) ($counts[Reservation::STATUS_CANCELLED] ?? 0),
                'no_show' => (int) ($counts[Reservation::STATUS_NO_SHOW] ?? 0),
            ];
        });
    }

    /**
     * @param  array<int, string>  $allowedStatuses
     */
    protected function ensureTransition(Reservation $reservation, array $allowedStatuses, string $message): void
    {
        abort_unless(in_array($reservation->status, $allowedStatuses, true), 422, $message);
    }

    /**
     * @return array<string, int>
     */
    protected function todaySummary(Request $request): array
    {
        return Cache::remember($this->summaryCacheKey($request, 'today-summary'), now()->addSeconds(self::SUMMARY_TTL_SECONDS), function () use ($request): array {
            $base = $this->ownedReservations($request)
                ->whereDate('reservation_date', today());

            if ($request->filled('venue_id')) {
                $base->where('venue_id', $request->integer('venue_id'));
            }

            $counts = (clone $base)
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status');

            return [
                'total' => (int) $counts->sum(),
                'pending' => (int) ($counts[Reservation::STATUS_PENDING] ?? 0),
                'confirmed' => (int) ($counts[Reservation::STATUS_CONFIRMED] ?? 0),
                'cancelled' => (int) ($counts[Reservation::STATUS_CANCELLED] ?? 0),
            ];
        });
    }

    protected function summaryCacheKey(Request $request, string $scope): string
    {
        return sprintf(
            'dashboard:owner:%s:%d:%s',
            $scope,
            $request->user()->id,
            md5(json_encode([
                'venue_id' => $request->input('venue_id'),
                'date' => today()->toDateString(),
            ]) ?: ''),
        );
    }
}
