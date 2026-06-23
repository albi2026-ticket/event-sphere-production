<?php

namespace App\Http\Controllers\Api\Owner;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReservationResource;
use App\Mail\ReservationCancelledMail;
use App\Mail\ReservationConfirmedMail;
use App\Models\Reservation;
use App\Models\Venue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class OwnerReservationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = $this->ownedReservations($request)
            ->with(['venue', 'user']);

        $this->applyFilters($query, $request);

        return ReservationResource::collection(
            $query->orderBy('reservation_date')
                ->orderBy('reservation_time')
                ->paginate($request->integer('per_page', 15)),
        )->additional(['meta' => ['stats' => $this->stats($request)]]);
    }

    public function show(Request $request, Reservation $reservation): ReservationResource
    {
        $this->authorizeOwner($request, $reservation);

        return new ReservationResource($reservation->load(['venue', 'user']));
    }

    public function confirm(Request $request, Reservation $reservation): ReservationResource
    {
        $this->authorizeOwner($request, $reservation);

        $reservation->update(['status' => Reservation::STATUS_CONFIRMED]);
        $reservation = $reservation->fresh(['venue', 'user']);

        Mail::to($reservation->user->email, $reservation->guest_name)
            ->send(new ReservationConfirmedMail($reservation));

        return new ReservationResource($reservation);
    }

    public function cancel(Request $request, Reservation $reservation): ReservationResource
    {
        $this->authorizeOwner($request, $reservation);

        $reservation->update([
            'status' => Reservation::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);
        $reservation = $reservation->fresh(['venue', 'user']);

        Mail::to($reservation->user->email, $reservation->guest_name)
            ->send(new ReservationCancelledMail($reservation));

        return new ReservationResource($reservation);
    }

    public function complete(Request $request, Reservation $reservation): ReservationResource
    {
        $this->authorizeOwner($request, $reservation);

        $reservation->update(['status' => Reservation::STATUS_COMPLETED]);

        return new ReservationResource($reservation->fresh(['venue', 'user']));
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

    protected function applyFilters(Builder $query, Request $request): void
    {
        $request->validate([
            'status' => ['sometimes', Rule::in([
                Reservation::STATUS_PENDING,
                Reservation::STATUS_CONFIRMED,
                Reservation::STATUS_COMPLETED,
                Reservation::STATUS_CANCELLED,
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
        ];
    }
}
