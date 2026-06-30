<?php

namespace App\Services\Dashboard;

use App\Models\Event;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Ticket;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Collection;

class OrganizerDashboardService
{
    private const SUMMARY_TTL_SECONDS = 45;

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function summary(User $organizer, array $filters = []): array
    {
        return [
            'organizer' => [
                'id' => $organizer->id,
                'name' => $organizer->name,
                'email' => $organizer->email,
                'role' => $organizer->role,
                'organizer_status' => $organizer->organizer_status,
            ],
            'cards' => $this->summaryCards($organizer, $filters),
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
            'conversion_metrics' => $this->conversionMetrics($organizer, $filters),
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
     * Future-ready conversion shape. Event view tracking is intentionally not
     * implemented yet, so view counts and conversion rates remain nullable.
     *
     * @param  array<string, mixed>  $filters
     */
    public function conversionMetrics(User $organizer, array $filters = []): Collection
    {
        return $this->eventPerformance($organizer, $filters)
            ->map(fn ($event) => [
                'event_id' => $event->event_id,
                'title' => $event->title,
                'event_views' => null,
                'ticket_purchases' => (int) $event->orders_count,
                'tickets_sold' => (int) $event->tickets_sold,
                'conversion_rate' => null,
            ]);
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
            ->with(['user:id,name,email,phone', 'event:id,title,slug,organizer_id,starts_at', 'ticketType:id,name', 'order:id,user_id,order_number,payment_status', 'order.user:id,name,email', 'checkedInBy:id,name']);
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
            ->with(['user:id,name,email,phone', 'event:id,title,slug,organizer_id,starts_at', 'ticketType:id,name', 'order:id,user_id,order_number,payment_status', 'order.user:id,name,email'])
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
        return $this->ticketsBaseQuery($organizer, $filters)
            ->select('tickets.*');
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    protected function ticketsBaseQuery(User $organizer, array $filters = []): Builder
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
                        ->orWhere('tickets.attendee_name', 'like', $needle)
                        ->orWhere('tickets.attendee_email', 'like', $needle)
                        ->orWhere('events.title', 'like', $needle)
                        ->orWhereHas('user', fn ($userQuery) => $userQuery
                        ->where('name', 'like', $needle)
                        ->orWhere('email', 'like', $needle));
                });
            });
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

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function summaryCards(User $organizer, array $filters = []): array
    {
        return Cache::remember(
            $this->cacheKey('summary-cards', $organizer, $filters),
            now()->addSeconds(self::SUMMARY_TTL_SECONDS),
            function () use ($organizer, $filters): array {
                $now = now();
                $eventAgg = $this->eventsQuery($organizer, $filters)
                    ->selectRaw(
                        'COUNT(*) as events_count,
                        SUM(CASE WHEN events.status = ? THEN 1 ELSE 0 END) as published_events_count,
                        SUM(CASE WHEN events.starts_at >= ? THEN 1 ELSE 0 END) as upcoming_events_count,
                        SUM(CASE WHEN events.starts_at < ? THEN 1 ELSE 0 END) as past_events_count',
                        ['published', $now, $now],
                    )
                    ->first();

                $orderAgg = $this->ordersQuery($organizer, $filters)
                    ->selectRaw(
                        'COUNT(DISTINCT orders.id) as orders_count,
                        COUNT(DISTINCT CASE WHEN orders.payment_status = ? THEN orders.id END) as paid_orders_count',
                        [Order::PAYMENT_STATUS_PAID],
                    )
                    ->first();

                $orderItemAgg = $this->paidOrderItemsQuery($organizer, $filters)
                    ->selectRaw('COALESCE(SUM(order_items.quantity), 0) as tickets_sold, COALESCE(SUM(order_items.total), 0) as total_revenue')
                    ->first();

                $ticketAgg = $this->ticketsBaseQuery($organizer, $filters)
                    ->selectRaw(
                        'COUNT(*) as attendees_count,
                        SUM(CASE WHEN tickets.status = ? THEN 1 ELSE 0 END) as checked_in_count,
                        SUM(CASE WHEN tickets.status = ? THEN 1 ELSE 0 END) as active_tickets_count',
                        [Ticket::STATUS_USED, Ticket::STATUS_ACTIVE],
                    )
                    ->first();

                $soldOutTicketTypes = $this->ticketTypesQuery($organizer, $filters)
                    ->where('ticket_types.status', TicketType::STATUS_SOLD_OUT)
                    ->count();

                return [
                    'events_count' => (int) ($eventAgg->events_count ?? 0),
                    'published_events_count' => (int) ($eventAgg->published_events_count ?? 0),
                    'upcoming_events_count' => (int) ($eventAgg->upcoming_events_count ?? 0),
                    'past_events_count' => (int) ($eventAgg->past_events_count ?? 0),
                    'orders_count' => (int) ($orderAgg->orders_count ?? 0),
                    'paid_orders_count' => (int) ($orderAgg->paid_orders_count ?? 0),
                    'tickets_sold' => (int) ($orderItemAgg->tickets_sold ?? 0),
                    'attendees_count' => (int) ($ticketAgg->attendees_count ?? 0),
                    'checked_in_count' => (int) ($ticketAgg->checked_in_count ?? 0),
                    'active_tickets_count' => (int) ($ticketAgg->active_tickets_count ?? 0),
                    'total_revenue' => (string) ($orderItemAgg->total_revenue ?? 0),
                    'sold_out_ticket_types_count' => (int) $soldOutTicketTypes,
                ];
            },
        );
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    protected function cacheKey(string $scope, User $organizer, array $filters = []): string
    {
        ksort($filters);

        return sprintf(
            'dashboard:organizer:%s:%d:%s',
            $scope,
            $organizer->id,
            md5(json_encode($filters) ?: ''),
        );
    }
}
