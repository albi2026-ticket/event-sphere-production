<?php

namespace App\Services\Dashboard;

use App\Models\Order;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class UserDashboardService
{
    private const SUMMARY_TTL_SECONDS = 45;

    /**
     * @return array<string, mixed>
     */
    public function summary(User $user): array
    {
        return [
            'profile' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'organizer_status' => $user->organizer_status,
                'default_city' => $user->default_city,
                'avatar_url' => $user->avatar_url,
            ],
            'stats' => $this->stats($user),
            'recent' => [
                'orders' => $user->orders()
                    ->latest()
                    ->limit(5)
                    ->get(['id', 'order_number', 'status', 'payment_status', 'total', 'currency', 'created_at']),
                'tickets' => $user->tickets()
                    ->with(['user:id,name,email,phone', 'event:id,title,slug,venue_name,city,starts_at', 'ticketType:id,name', 'order:id,order_number,status,payment_status,total,currency,created_at'])
                    ->orderByDesc(Order::query()->select('created_at')->whereColumn('orders.id', 'tickets.order_id'))
                    ->orderByDesc('tickets.id')
                    ->limit(5)
                    ->get(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function stats(User $user): array
    {
        return Cache::remember(
            "dashboard:user:summary-cards:{$user->id}",
            now()->addSeconds(self::SUMMARY_TTL_SECONDS),
            function () use ($user): array {
                $orderAgg = $user->orders()
                    ->selectRaw(
                        'COUNT(*) as orders_count,
                        SUM(CASE WHEN payment_status = ? THEN 1 ELSE 0 END) as paid_orders_count,
                        SUM(CASE WHEN payment_status = ? THEN 1 ELSE 0 END) as pending_orders_count,
                        COALESCE(SUM(CASE WHEN payment_status = ? THEN total ELSE 0 END), 0) as total_spent',
                        [
                            Order::PAYMENT_STATUS_PAID,
                            Order::PAYMENT_STATUS_PENDING,
                            Order::PAYMENT_STATUS_PAID,
                        ],
                    )
                    ->first();

                $ticketAgg = $user->tickets()
                    ->selectRaw(
                        'COUNT(*) as tickets_count,
                        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as active_tickets_count,
                        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as used_tickets_count,
                        SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as cancelled_tickets_count',
                        [
                            Ticket::STATUS_ACTIVE,
                            Ticket::STATUS_USED,
                            Ticket::STATUS_CANCELLED,
                            Ticket::STATUS_REFUNDED,
                        ],
                    )
                    ->first();

                $upcomingEvents = $user->tickets()
                    ->join('events', 'events.id', '=', 'tickets.event_id')
                    ->where('events.starts_at', '>=', now())
                    ->whereNotIn('tickets.status', [Ticket::STATUS_CANCELLED, Ticket::STATUS_REFUNDED])
                    ->distinct('tickets.event_id')
                    ->count('tickets.event_id');

                return [
                    'orders_count' => (int) ($orderAgg->orders_count ?? 0),
                    'paid_orders_count' => (int) ($orderAgg->paid_orders_count ?? 0),
                    'pending_orders_count' => (int) ($orderAgg->pending_orders_count ?? 0),
                    'tickets_count' => (int) ($ticketAgg->tickets_count ?? 0),
                    'active_tickets_count' => (int) ($ticketAgg->active_tickets_count ?? 0),
                    'used_tickets_count' => (int) ($ticketAgg->used_tickets_count ?? 0),
                    'cancelled_tickets_count' => (int) ($ticketAgg->cancelled_tickets_count ?? 0),
                    'favorites_count' => $user->favorites()->count(),
                    'upcoming_events_count' => (int) $upcomingEvents,
                    'total_spent' => (string) ($orderAgg->total_spent ?? 0),
                ];
            },
        );
    }
}
