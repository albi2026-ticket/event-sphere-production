# User Dashboard API

The user dashboard is API-only and designed to replace frontend mock data without changing existing React routes or layout.

## Authenticated Flow

All dashboard endpoints require Sanctum authentication:

```http
Authorization: Bearer <token>
Accept: application/json
```

## Summary Endpoints

Existing compatible endpoint:

```http
GET /api/me/dashboard
```

Expanded alias:

```http
GET /api/me/dashboard/summary
```

Returns profile snapshot, dashboard counters, recent orders, and recent tickets.

Upcoming events:

```http
GET /api/me/dashboard/upcoming-events
```

Returns unique upcoming events derived from the user's tickets, with the related tickets included.

## Tickets

```http
GET /api/me/tickets
GET /api/me/tickets/active
GET /api/me/tickets/history
GET /api/orders/{order}/tickets
GET /api/tickets/{ticket}
GET /api/tickets/{ticket}/qr-code
GET /api/tickets/{ticket}/download
```

Filters:

```http
GET /api/me/tickets?status=active&upcoming=1&search=festival&sort=starts_at&per_page=12
```

Ticket statuses:
- `active`
- `used`
- `cancelled`
- `refunded`

QR display:

```tsx
<img src={`/api/tickets/${ticket.id}/qr-code`} alt={ticket.ticket_code} />
```

Download:

```tsx
<a href={`/api/tickets/${ticket.id}/download`}>Download PDF</a>
```

Returns one attendee-specific PDF ticket with the ticket QR code. If the frontend authenticates with bearer tokens, use `fetch`, convert the response to a blob, and open an object URL.

## Orders

```http
GET /api/me/orders
GET /api/me/orders/{order}
GET /api/me/orders/{order}/receipt
```

Filters:

```http
GET /api/me/orders?payment_status=paid&search=ES-2026&sort=-created_at&per_page=10
```

Order responses include subtotal, fees, discounts, tax, total, payment status, order items, tickets, and `receipt_url`.

## Favorites

```http
GET /api/me/favorites
POST /api/me/favorites
POST /api/me/favorites/toggle
DELETE /api/me/favorites/{event}
```

Add favorite:

```json
{
  "event_id": 42
}
```

List filters:

```http
GET /api/me/favorites?category=music&city=Pristina&upcoming=1&search=jazz&sort=starts_at
```

Only published, public events can be favorited.

## Profile

```http
GET /api/me/profile
PATCH /api/me/profile
```

Editable fields:

```json
{
  "name": "Ari User",
  "first_name": "Ari",
  "last_name": "User",
  "phone": "+383...",
  "default_city": "Pristina",
  "email_notifications": true,
  "sms_reminders": false,
  "marketing_emails": false
}
```

## Frontend Loading Strategy

Recommended dashboard load:
1. Fetch `/api/me/dashboard` for summary cards and recent activity.
2. Fetch visible tab data separately:
   - tickets tab: `/api/me/tickets`
   - orders tab: `/api/me/orders`
   - favorites tab: `/api/me/favorites`
   - profile tab: `/api/me/profile`
3. Use Laravel pagination `links` and `meta` from paginated responses for pagination controls.
4. Preserve current UI state and only swap mock arrays for API results.

## Security

- Every endpoint is behind `auth:sanctum`.
- User ticket/order/favorite/profile data is scoped to `request()->user()`.
- Ticket detail, QR, and download routes use ownership policies.
- Receipt downloads verify order ownership.
- Organizer and admin dashboard systems remain separate and can expand independently.
