<?php

namespace App\Services\Dashboard;

use App\Models\Event;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Ticket;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class OrganizerDashboardService
{
    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function summary(User $organizer, array $filters = []): array
    {
        $events = $this->eventsQuery($organizer, $filters);
        $tickets = $this->ticketsQuery($organizer, $filters);
        $orderItems = $this->paidOrderItemsQuery($organizer, $filters);
        $orders = $this->ordersQuery($organizer, $filters);

        return [
            'organizer' => [
                'id' => $organizer->id,
                'name' => $organizer->name,
                'email' => $organizer->email,
                'role' => $organizer->role,
                'organizer_status' => $organizer->organizer_status,
            ],
            'cards' => [
                'events_count' => (clone $events)->count(),
                'published_events_count' => (clone $events)->where('status', 'published')->count(),
                'upcoming_events_count' => (clone $events)->where('starts_at', '>=', now())->count(),
                'past_events_count' => (clone $events)->where('starts_at', '<', now())->count(),
                'orders_count' => (clone $orders)->distinct('orders.id')->count('orders.id'),
                'paid_orders_count' => (clone $orders)->where('orders.payment_status', Order::PAYMENT_STATUS_PAID)->distinct('orders.id')->count('orders.id'),
                'tickets_sold' => (int) (clone $orderItems)->sum('order_items.quantity'),
                'attendees_count' => (clone $tickets)->count(),
                'checked_in_count' => (clone $tickets)->where('tickets.status', Ticket::STATUS_USED)->count(),
                'active_tickets_count' => (clone $tickets)->where('tickets.status', Ticket::STATUS_ACTIVE)->count(),
                'total_revenue' => (string) (clone $orderItems)->sum('order_items.total'),
                'sold_out_ticket_types_count' => $this->ticketTypesQuery($organizer, $filters)
                    ->where('ticket_types.status', TicketType::STATUS_SOLD_OUT)
                    ->count(),
            ],
            'recent_orders' => $this->recentOrders($organizer, $filters, 5),
            'recent_attendees' => $this->recentAttendees($organizer, $filters, 5),
            'top_selling_events' => $this->topSellingEvents($organizer, $filters, 5),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function analytics(User $organizer, array $filters = []): array
    {
        return [
            'summary' => $this->summary($organizer, $filters)['cards'],
            'revenue_by_event' => $this->revenueByEvent($organizer, $filters),
            'sales_trends' => $this->salesTrends($organizer, $filters),
            'ticket_inventory' => $this->inventorySummary($organizer, $filters),
            'event_performance' => $this->eventPerformance($organizer, $filters),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function revenueByEvent(User $organizer, array $filters = []): Collection
    {
        return $this->paidOrderItemsQuery($organizer, $filters)
            ->join('events', 'events.id', '=', 'order_items.event_id')
            ->selectRaw('events.id as event_id, events.title, events.slug, events.currency, COALESCE(SUM(order_items.total), 0) as revenue, COALESCE(SUM(order_items.quantity), 0) as tickets_sold, COUNT(DISTINCT orders.id) as orders_count')
            ->groupBy('events.id', 'events.title', 'events.slug', 'events.currency')
            ->orderByDesc('revenue')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function salesTrends(User $organizer, array $filters = []): Collection
    {
        $groupExpression = match ($filters['group_by'] ?? 'day') {
            'month' => "DATE_TRUNC('month', orders.created_at)",
            'week' => "DATE_TRUNC('week', orders.created_at)",
            default => 'DATE(orders.created_at)',
        };

        return $this->paidOrderItemsQuery($organizer, $filters)
            ->selectRaw("{$groupExpression} as period, COALESCE(SUM(order_items.total), 0) as revenue, COALESCE(SUM(order_items.quantity), 0) as tickets_sold, COUNT(DISTINCT orders.id) as orders_count")
            ->groupBy('period')
            ->orderBy('period')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function inventorySummary(User $organizer, array $filters = []): Collection
    {
        return $this->ticketTypesQuery($organizer, $filters)
            ->join('events', 'events.id', '=', 'ticket_types.event_id')
            ->selectRaw('ticket_types.id as ticket_type_id, ticket_types.name, ticket_types.status, ticket_types.quantity_total, ticket_types.quantity_sold, ticket_types.quantity_reserved, (ticket_types.quantity_total - ticket_types.quantity_sold - ticket_types.quantity_reserved) as quantity_available, events.id as event_id, events.title as event_title, events.slug as event_slug')
            ->orderBy('events.starts_at')
            ->orderBy('ticket_types.sort_order')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function eventPerformance(User $organizer, array $filters = []): Collection
    {
        return $this->eventsQuery($organizer, $filters)
            ->selectRaw('events.id as event_id, events.title, events.slug, events.status, events.visibility, events.starts_at, events.currency')
            ->selectRaw('(SELECT COALESCE(SUM(ticket_types.quantity_total), 0) FROM ticket_types WHERE ticket_types.event_id = events.id) as tickets_total')
            ->selectRaw('(SELECT COALESCE(SUM(ticket_types.quantity_sold), 0) FROM ticket_types WHERE ticket_types.event_id = events.id) as tickets_sold')
            ->selectRaw('(SELECT COALESCE(SUM(ticket_types.quantity_total - ticket_types.quantity_sold - ticket_types.quantity_reserved), 0) FROM ticket_types WHERE ticket_types.event_id = events.id) as tickets_available')
            ->selectRaw('(SELECT COUNT(DISTINCT orders.id) FROM orders INNER JOIN order_items ON order_items.order_id = orders.id WHERE order_items.event_id = events.id AND orders.payment_status = ?) as orders_count', [Order::PAYMENT_STATUS_PAID])
            ->selectRaw('(SELECT COUNT(*) FROM tickets WHERE tickets.event_id = events.id) as attendees_count')
            ->selectRaw('(SELECT COUNT(*) FROM tickets WHERE tickets.event_id = events.id AND tickets.status = ?) as checked_in_count', [Ticket::STATUS_USED])
            ->selectRaw('(SELECT COALESCE(SUM(order_items.total), 0) FROM order_items INNER JOIN orders ON orders.id = order_items.order_id WHERE order_items.event_id = events.id AND orders.payment_status = ?) as revenue', [Order::PAYMENT_STATUS_PAID])
            ->selectRaw('(SELECT COUNT(*) FROM ticket_types WHERE ticket_types.event_id = events.id AND ticket_types.status = ?) as sold_out_ticket_types_count', [TicketType::STATUS_SOLD_OUT])
            ->orderByDesc('revenue')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function ordersListQuery(User $organizer, array $filters = []): Builder
    {
        return $this->ordersQuery($organizer, $filters)
            ->with(['user:id,name,email', 'items.event:id,title,slug,organizer_id', 'items.ticketType:id,name'])
            ->select('orders.*')
            ->distinct();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function attendeesListQuery(User $organizer, array $filters = []): Builder
    {
        return $this->ticketsQuery($organizer, $filters)
            ->with(['user:id,name,email,phone', 'event:id,title,slug,organizer_id,starts_at', 'ticketType:id,name', 'order:id,order_number,payment_status', 'checkedInBy:id,name']);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function recentOrders(User $organizer, array $filters = [], int $limit = 10): Collection
    {
        return $this->ordersQuery($organizer, $filters)
            ->with(['user:id,name,email', 'items.event:id,title,slug,organizer_id', 'items.ticketType:id,name'])
            ->select('orders.*')
            ->distinct()
            ->latest('orders.created_at')
            ->limit($limit)
            ->get();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function recentAttendees(User $organizer, array $filters = [], int $limit = 10): Collection
    {
        return $this->ticketsQuery($organizer, $filters)
            ->with(['user:id,name,email,phone', 'event:id,title,slug,organizer_id,starts_at', 'ticketType:id,name', 'order:id,order_number,payment_status'])
            ->latest('tickets.created_at')
            ->limit($limit)
            ->get();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function topSellingEvents(User $organizer, array $filters = [], int $limit = 5): Collection
    {
        return $this->revenueByEvent($organizer, $filters)->take($limit)->values();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function eventsQuery(User $organizer, array $filters = []): Builder
    {
        return Event::query()
            ->where('organizer_id', $organizer->id)
            ->when($filters['event_id'] ?? null, fn ($query, $eventId) => $query->where('events.id', $eventId))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('events.status', $status))
            ->when($filters['date_from'] ?? null, fn ($query, $date) => $query->where('events.starts_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn ($query, $date) => $query->where('events.starts_at', '<=', $date))
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where('events.title', 'like', "%{$search}%"));
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    protected function paidOrderItemsQuery(User $organizer, array $filters = []): Builder
    {
        return OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('events as filtered_events', 'filtered_events.id', '=', 'order_items.event_id')
            ->where('filtered_events.organizer_id', $organizer->id)
            ->where('orders.payment_status', Order::PAYMENT_STATUS_PAID)
            ->when($filters['event_id'] ?? null, fn ($query, $eventId) => $query->where('order_items.event_id', $eventId))
            ->when($filters['date_from'] ?? null, fn ($query, $date) => $query->where('orders.created_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn ($query, $date) => $query->where('orders.created_at', '<=', $date));
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    protected function ordersQuery(User $organizer, array $filters = []): Builder
    {
        return Order::query()
            ->join('order_items', 'order_items.order_id', '=', 'orders.id')
            ->join('events', 'events.id', '=', 'order_items.event_id')
            ->where('events.organizer_id', $organizer->id)
            ->when($filters['event_id'] ?? null, fn ($query, $eventId) => $query->where('events.id', $eventId))
            ->when($filters['payment_status'] ?? null, fn ($query, $status) => $query->where('orders.payment_status', $status))
            ->when($filters['date_from'] ?? null, fn ($query, $date) => $query->where('orders.created_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn ($query, $date) => $query->where('orders.created_at', '<=', $date));
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    protected function ticketsQuery(User $organizer, array $filters = []): Builder
    {
        return Ticket::query()
            ->join('events', 'events.id', '=', 'tickets.event_id')
            ->where('events.organizer_id', $organizer->id)
            ->when($filters['event_id'] ?? null, fn ($query, $eventId) => $query->where('tickets.event_id', $eventId))
            ->when($filters['ticket_status'] ?? null, fn ($query, $status) => $query->where('tickets.status', $status))
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $needle = '%'.$search.'%';

                $query->where(function ($query) use ($needle): void {
                    $query
                        ->where('tickets.ticket_code', 'like', $needle)
                        ->orWhere('events.title', 'like', $needle)
                        ->orWhereHas('user', fn ($userQuery) => $userQuery
                            ->where('name', 'like', $needle)
                            ->orWhere('email', 'like', $needle));
                });
            })
            ->select('tickets.*');
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    protected function ticketTypesQuery(User $organizer, array $filters = []): Builder
    {
        return TicketType::query()
            ->join('events as filtered_events', 'filtered_events.id', '=', 'ticket_types.event_id')
            ->where('filtered_events.organizer_id', $organizer->id)
            ->when($filters['event_id'] ?? null, fn ($query, $eventId) => $query->where('ticket_types.event_id', $eventId));
    }
}
