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
use Illuminate\Validation\Rule;

class OwnerReservationController extends Controller
{
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
            'Calendar date range cannot exceed 62 days.',
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

        return new ReservationResource($reservation->load(['venue', 'user']));
    }

    public function confirm(Request $request, Reservation $reservation): ReservationResource
    {
        $this->ensureVerifiedOwner($request);
        $this->authorizeOwner($request, $reservation);
        $this->ensureTransition($reservation, [Reservation::STATUS_PENDING], 'Only pending reservations can be confirmed.');

        $reservation->update(['status' => Reservation::STATUS_CONFIRMED]);
        $reservation = $reservation->fresh(['venue', 'user']);

        Mail::to($reservation->user->email, $reservation->guest_name)
            ->send(new ReservationConfirmedMail($reservation));

        if ($reservation->user) {
            app(NotificationService::class)->create(
                $reservation->user,
                Notification::TYPE_RESERVATION_CONFIRMED,
                'Reservation Confirmed',
                "Your reservation at {$reservation->venue->name} has been confirmed.",
                '/site/my-reservations.html',
            );
        }

        return new ReservationResource($reservation);
    }

    public function cancel(Request $request, Reservation $reservation): ReservationResource
    {
        $this->ensureVerifiedOwner($request);
        $this->authorizeOwner($request, $reservation);
        $this->ensureTransition($reservation, [Reservation::STATUS_PENDING, Reservation::STATUS_CONFIRMED], 'Only pending or confirmed reservations can be cancelled.');
        $payload = $request->validate([
            'owner_cancellation_reason' => ['required', 'string', 'max:1000'],
        ]);

        $reservation->update([
            'status' => Reservation::STATUS_CANCELLED,
            'owner_cancellation_reason' => $payload['owner_cancellation_reason'],
            'cancelled_at' => now(),
        ]);
        $reservation = $reservation->fresh(['venue', 'user']);

        Mail::to($reservation->user->email, $reservation->guest_name)
            ->send(new ReservationCancelledMail($reservation));

        if ($reservation->user) {
            app(NotificationService::class)->create(
                $reservation->user,
                Notification::TYPE_RESERVATION_CANCELLED,
                'Reservation Cancelled',
                "Your reservation at {$reservation->venue->name} was cancelled. Reason: {$reservation->owner_cancellation_reason}",
                '/site/my-reservations.html',
            );
        }

        return new ReservationResource($reservation);
    }

    public function complete(Request $request, Reservation $reservation): ReservationResource
    {
        $this->ensureVerifiedOwner($request);
        $this->authorizeOwner($request, $reservation);
        $this->ensureTransition($reservation, [Reservation::STATUS_CONFIRMED], 'Only confirmed reservations can be marked completed.');

        $reservation->update(['status' => Reservation::STATUS_COMPLETED]);
        $reservation = $reservation->fresh(['venue', 'user']);

        Mail::to($reservation->user->email, $reservation->guest_name)
            ->send(new ReservationCompletedMail($reservation));

        if ($reservation->user) {
            app(NotificationService::class)->create(
                $reservation->user,
                Notification::TYPE_RESERVATION_COMPLETED,
                'Reservation Completed',
                "Your reservation at {$reservation->venue->name} has been completed.",
                '/site/my-reservations.html',
            );
        }

        return new ReservationResource($reservation);
    }

    public function noShow(Request $request, Reservation $reservation): ReservationResource
    {
        $this->ensureVerifiedOwner($request);
        $this->authorizeOwner($request, $reservation);
        $this->ensureTransition($reservation, [Reservation::STATUS_CONFIRMED], 'Only confirmed reservations can be marked no show.');

        $reservation->update(['status' => Reservation::STATUS_NO_SHOW]);
        $reservation = $reservation->fresh(['venue', 'user']);

        Mail::to($reservation->user->email, $reservation->guest_name)
            ->send(new ReservationNoShowMail($reservation));

        if ($reservation->user) {
            app(NotificationService::class)->create(
                $reservation->user,
                Notification::TYPE_RESERVATION_NO_SHOW,
                'Reservation Marked As No Show',
                "Your reservation at {$reservation->venue->name} was marked as no show.",
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
                || ($request->user()->isOrganizer() && $reservation->venue->user_id === $request->user()->id),
            403,
        );
    }

    protected function ensureVerifiedOwner(Request $request): void
    {
        abort_unless(
            $request->user()?->hasVerifiedEmail(),
            403,
            'Please verify your email address before managing restaurant or bar reservations.',
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
        $base = $this->ownedReservations($request);

        return [
            'pending' => (clone $base)->where('status', Reservation::STATUS_PENDING)->count(),
            'confirmed' => (clone $base)->where('status', Reservation::STATUS_CONFIRMED)->count(),
            'today' => (clone $base)->whereDate('reservation_date', today())->count(),
            'upcoming' => (clone $base)
                ->whereIn('status', [Reservation::STATUS_PENDING, Reservation::STATUS_CONFIRMED])
                ->whereDate('reservation_date', '>=', today())
                ->count(),
            'completed' => (clone $base)->where('status', Reservation::STATUS_COMPLETED)->count(),
            'cancelled' => (clone $base)->where('status', Reservation::STATUS_CANCELLED)->count(),
            'no_show' => (clone $base)->where('status', Reservation::STATUS_NO_SHOW)->count(),
        ];
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
        $base = $this->ownedReservations($request)
            ->whereDate('reservation_date', today());

        if ($request->filled('venue_id')) {
            $base->where('venue_id', $request->integer('venue_id'));
        }

        return [
            'total' => (clone $base)->count(),
            'pending' => (clone $base)->where('status', Reservation::STATUS_PENDING)->count(),
            'confirmed' => (clone $base)->where('status', Reservation::STATUS_CONFIRMED)->count(),
            'cancelled' => (clone $base)->where('status', Reservation::STATUS_CANCELLED)->count(),
        ];
    }
}
