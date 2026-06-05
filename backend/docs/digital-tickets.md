# Digital Tickets and QR Check-In

Event Sphere generates digital tickets only after a trusted payment webhook marks an order as paid. Ticket QR codes contain a server-issued random token and can only be validated or checked in through authenticated organizer/admin API routes.

## Setup Commands

```bash
composer require endroid/qr-code
php artisan migrate
php artisan config:clear
```

Useful Laravel generator equivalents for future work:

```bash
php artisan make:controller Api/TicketController
php artisan make:controller Api/Organizer/OrganizerTicketController
php artisan make:controller Api/Admin/AdminTicketController
php artisan make:request Api/Tickets/ValidateTicketRequest
php artisan make:request Api/Tickets/CheckInTicketRequest
php artisan make:resource TicketResource
php artisan make:policy TicketPolicy --model=Ticket
```

## Ticket Lifecycle

1. User creates an order through the existing checkout flow.
2. Stripe Checkout completes payment.
3. Stripe sends `checkout.session.completed` to `/api/stripe/webhook`.
4. The webhook signature is verified.
5. The order is marked `paid`.
6. Inventory is committed.
7. One ticket is generated per purchased quantity.
8. Each ticket receives:
   - unique `ticket_code`
   - unique `qr_token`
   - scanner-friendly `qr_payload`
   - status `active`
9. Organizer/admin check-in changes ticket status to `used`.
10. Refunded tickets become `refunded`; cancelled tickets can become `cancelled`.

## User Ticket APIs

List authenticated user's tickets:

```http
GET /api/me/tickets
Authorization: Bearer <token>
Accept: application/json
```

Show one ticket:

```http
GET /api/tickets/{ticket}
Authorization: Bearer <token>
Accept: application/json
```

Get QR SVG:

```http
GET /api/tickets/{ticket}/qr-code
Authorization: Bearer <token>
```

Download digital ticket PDF:

```http
GET /api/tickets/{ticket}/download
Authorization: Bearer <token>
```

List tickets for an order:

```http
GET /api/orders/{order}/tickets
Authorization: Bearer <token>
Accept: application/json
```

## QR Validation Example

The QR payload is JSON:

```json
{
  "type": "event_sphere_ticket",
  "version": 1,
  "token": "server-generated-random-token",
  "validation_url": "https://api.example.com/api/tickets/validate"
}
```

Scanner apps can extract `token` and call:

```http
POST /api/tickets/validate
Authorization: Bearer <organizer-or-admin-token>
Accept: application/json
Content-Type: application/json

{
  "token": "server-generated-random-token",
  "event_id": 10
}
```

Response:

```json
{
  "data": {
    "validation": {
      "is_valid": true,
      "can_check_in": true,
      "reason": "Ticket is active and ready for check-in.",
      "ticket_status": "active",
      "checked_in_at": null
    },
    "ticket": {
      "id": 44,
      "ticket_code": "ES-ABC123...",
      "status": "active"
    }
  }
}
```

## Organizer Check-In

Organizers can only check in tickets for events they own.

```http
POST /api/organizer/tickets/check-in
Authorization: Bearer <organizer-token>
Accept: application/json
Content-Type: application/json

{
  "token": "server-generated-random-token",
  "event_id": 10,
  "method": "qr"
}
```

Duplicate check-ins are blocked because the service locks the ticket row and only allows `active` tickets to become `used`.

Organizer attendee list:

```http
GET /api/organizer/events/{event}/attendees
Authorization: Bearer <organizer-token>
Accept: application/json
```

## Admin Ticket Management

```http
GET /api/admin/tickets
GET /api/admin/tickets/{ticket}
POST /api/admin/tickets/validate
POST /api/admin/tickets/check-in
PATCH /api/admin/tickets/{ticket}/status
```

Status update example:

```json
{
  "status": "cancelled",
  "notes": "Cancelled by support."
}
```

Allowed statuses:
- `active`
- `used`
- `cancelled`
- `refunded`

## Frontend Integration

Keep the existing ticket/order pages and replace mock ticket data with these API calls:

```ts
async function fetchMyTickets(token: string) {
  const response = await fetch('/api/me/tickets', {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error('Unable to load tickets.');
  return response.json();
}
```

Display QR codes with the SVG endpoint:

```tsx
<img src={`/api/tickets/${ticket.id}/qr-code`} alt={`QR code for ${ticket.ticket_code}`} />
```

Download with the existing button style:

```tsx
<a href={`/api/tickets/${ticket.id}/download`}>Download PDF</a>
```

If the frontend uses bearer tokens rather than cookies, fetch the download endpoint and create an object URL for the returned PDF blob.

## Security Notes

- Users can view/download only their own tickets.
- Organizers validate/check in only tickets for their own events.
- Admins can validate and manage all tickets.
- QR tokens are random server-generated values.
- Check-in is idempotency-safe through row locking and status checks.
- Payment redirects never create tickets; only verified Stripe webhooks do.
- Refunded tickets are marked `refunded` and no longer pass validation.
