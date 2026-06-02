<?php

namespace App\Services\Dashboard;

use App\Models\Order;
use App\Models\Ticket;
use App\Models\User;

class UserDashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(User $user): array
    {
        $tickets = $user->tickets();
        $orders = $user->orders();
        $paidOrders = (clone $orders)->where('payment_status', Order::PAYMENT_STATUS_PAID);

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
            'stats' => [
                'orders_count' => (clone $orders)->count(),
                'paid_orders_count' => (clone $orders)->where('payment_status', Order::PAYMENT_STATUS_PAID)->count(),
                'pending_orders_count' => (clone $orders)->where('payment_status', Order::PAYMENT_STATUS_PENDING)->count(),
                'tickets_count' => (clone $tickets)->count(),
                'active_tickets_count' => (clone $tickets)->where('status', Ticket::STATUS_ACTIVE)->count(),
                'used_tickets_count' => (clone $tickets)->where('status', Ticket::STATUS_USED)->count(),
                'cancelled_tickets_count' => (clone $tickets)->whereIn('status', [Ticket::STATUS_CANCELLED, Ticket::STATUS_REFUNDED])->count(),
                'favorites_count' => $user->favorites()->count(),
                'upcoming_events_count' => (clone $tickets)
                    ->whereHas('event', fn ($query) => $query->where('starts_at', '>=', now()))
                    ->distinct('event_id')
                    ->count('event_id'),
                'total_spent' => (string) $paidOrders->sum('total'),
            ],
            'recent' => [
                'orders' => $user->orders()
                    ->latest()
                    ->limit(5)
                    ->get(['id', 'order_number', 'status', 'payment_status', 'total', 'currency', 'created_at']),
                'tickets' => $user->tickets()
                    ->with(['user:id,name,email,phone', 'event:id,title,slug,venue_name,city,starts_at', 'ticketType:id,name'])
                    ->latest()
                    ->limit(5)
                    ->get(),
            ],
        ];
    }
}
