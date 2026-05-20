# Organizer Dashboard API

The organizer dashboard is API-only and keeps the existing frontend organizer pages intact. Existing organizer event CRUD, ticket type, image, attendee, and payment APIs remain available; this layer adds dashboard summaries and analytics endpoints that can replace mock dashboard data.

## Auth

Organizer endpoints require Sanctum auth and approved organizer access:

```http
Authorization: Bearer <token>
Accept: application/json
```

Admins can inspect organizer dashboards through admin-prefixed routes.

## Organizer Summary

Existing compatible endpoint:

```http
GET /api/organizer/dashboard
```

Expanded endpoint:

```http
GET /api/organizer/dashboard/summary
```

Returns organizer profile, summary cards, recent orders, recent attendees, and top-selling events.

## Analytics

```http
GET /api/organizer/analytics
GET /api/organizer/analytics/revenue
GET /api/organizer/analytics/sales-trends
GET /api/organizer/events/performance
GET /api/organizer/events/{event}/analytics
GET /api/organizer/inventory
```

Filters:

```http
GET /api/organizer/analytics?event_id=10&date_from=2026-05-01&date_to=2026-05-31
GET /api/organizer/analytics/sales-trends?group_by=week
GET /api/organizer/events/performance?status=published&sort=-revenue
```

Analytics responses are chart-ready:

```json
{
  "data": {
    "summary": {
      "total_revenue": "1200.00",
      "tickets_sold": 45,
      "attendees_count": 45
    },
    "revenue_by_event": [],
    "sales_trends": [],
    "ticket_inventory": [],
    "event_performance": []
  }
}
```

## Orders and Attendees

```http
GET /api/organizer/orders/recent
GET /api/organizer/attendees
GET /api/organizer/events/{event}/attendees
```

Examples:

```http
GET /api/organizer/attendees?event_id=10&ticket_status=active&per_page=25
GET /api/organizer/orders/recent?payment_status=paid&date_from=2026-05-01
```

Responses use Laravel pagination metadata, so React can read `data`, `links`, and `meta`.

## Event Management

Existing event-management APIs remain the source of truth:

```http
GET /api/organizer/events
POST /api/organizer/events
GET /api/organizer/events/{event}
PATCH /api/organizer/events/{event}
DELETE /api/organizer/events/{event}
POST /api/organizer/events/{event}/images
POST /api/organizer/events/{event}/ticket-types
PATCH /api/organizer/ticket-types/{ticketType}/inventory
```

The new analytics APIs do not replace CRUD; they provide dashboard-ready reporting around it.

## Admin Organizer Visibility

Admins can access organizer analytics without impersonating:

```http
GET /api/admin/organizers/{organizer}/dashboard/summary
GET /api/admin/organizers/{organizer}/analytics
GET /api/admin/organizers/{organizer}/analytics/revenue
GET /api/admin/organizers/{organizer}/events/performance
GET /api/admin/organizers/{organizer}/inventory
GET /api/admin/organizers/{organizer}/orders
GET /api/admin/organizers/{organizer}/attendees
```

## Calculation Flow

Revenue is calculated from paid order items for events owned by the organizer:

```text
orders.payment_status = paid
order_items.event_id belongs to organizer event
revenue = SUM(order_items.total)
tickets_sold = SUM(order_items.quantity)
```

Attendee statistics are calculated from generated tickets:

```text
attendees_count = COUNT(tickets)
checked_in_count = COUNT(tickets where status = used)
active_tickets_count = COUNT(tickets where status = active)
```

Inventory summaries use ticket type quantities:

```text
available = quantity_total - quantity_sold - quantity_reserved
sold_out = ticket_types.status = sold_out
```

## Frontend Integration

Recommended dashboard load:

```ts
async function fetchOrganizerSummary(token: string) {
  const response = await fetch('/api/organizer/dashboard/summary', {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error('Unable to load organizer dashboard.');
  return response.json();
}
```

Suggested loading strategy:
1. Fetch `/api/organizer/dashboard/summary` for summary cards and dashboard previews.
2. Fetch `/api/organizer/analytics/sales-trends` only when a chart is visible.
3. Fetch `/api/organizer/events/performance` for event performance tables.
4. Fetch `/api/organizer/attendees` for attendee management views.
5. Use `per_page`, `sort`, `date_from`, `date_to`, `event_id`, and status filters to drive existing table controls.

## Ownership and Security

- Organizer routes require `role:organizer`.
- Approved organizer access is enforced by the existing role middleware.
- Event-scoped analytics use `organizer.event` middleware.
- Query scopes always filter by `events.organizer_id`.
- Admin routes require `role:admin` and intentionally override organizer ownership.
- Attendee/order information is only returned for the organizer's own events unless the requester is an admin.
