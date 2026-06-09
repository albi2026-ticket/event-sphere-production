# Stripe Checkout Integration

Event Sphere uses a server-created Stripe Checkout Session and fulfills orders only from verified Stripe webhooks.

## Artisan and Setup Commands

```bash
composer require stripe/stripe-php
php artisan migrate
php artisan config:clear
```

For local webhook testing:

```bash
stripe login
stripe listen --forward-to http://127.0.0.1:8000/api/stripe/webhook
```

Copy the webhook signing secret printed by the Stripe CLI into `STRIPE_WEBHOOK_SECRET`.

## Environment

```env
FRONTEND_URL=http://localhost:8080
STRIPE_SECRET=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
STRIPE_CURRENCY=USD
STRIPE_CHECKOUT_SUCCESS_URL="${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}"
STRIPE_CHECKOUT_CANCEL_URL="${FRONTEND_URL}/checkout/cancelled?order={ORDER_NUMBER}"
```

## API Endpoints

Create a Checkout Session for the authenticated user's own order:

```http
POST /api/orders/{order}/checkout-session
Authorization: Bearer <token>
Accept: application/json
```

Refresh payment status after redirect:

```http
GET /api/orders/{order}/payment-status
Authorization: Bearer <token>
Accept: application/json
```

Response:

```json
{
  "data": {
    "checkout_session_id": "cs_test_...",
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
    "payment_status": "pending",
    "order": {
      "id": 123,
      "order_number": "ES-2026-000123",
      "status": "pending",
      "payment_status": "pending",
      "total": "49.00",
      "currency": "USD"
    }
  }
}
```

Stripe webhook endpoint:

```http
POST /api/stripe/webhook
Stripe-Signature: t=...,v1=...
```

Organizer payment visibility:

```http
GET /api/organizer/payments
GET /api/organizer/payments/{order}
```

Admin payment visibility and refunds:

```http
GET /api/admin/payments
GET /api/admin/payments/{order}
POST /api/admin/payments/{order}/refund
```

Refund payload:

```json
{
  "amount": 25.00,
  "reason": "requested_by_customer"
}
```

Omit `amount` for a full refund.

## Frontend API Integration Example

Keep the existing checkout UI and connect the existing pay button to this call:

```ts
async function startStripeCheckout(orderId: number, token: string) {
  const response = await fetch(`/api/orders/${orderId}/checkout-session`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Unable to start Stripe checkout.');
  }

  const payload = await response.json();
  window.location.href = payload.data.checkout_url;
}
```

Recommended UI states without changing structure:
- Disable the existing pay button while the request is loading.
- Show the existing error surface if the API returns validation errors.
- Read `session_id` on the success route and refresh the order from the API or dashboard data.

## Payment Flow

1. The frontend creates an order using the existing order flow.
2. The frontend calls `POST /api/orders/{order}/checkout-session`.
3. Laravel validates order ownership and creates a Stripe Checkout Session using server-side order totals.
4. The frontend redirects to `checkout_url`.
5. Stripe sends a webhook to `/api/stripe/webhook`.
6. Laravel verifies `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`.
7. Laravel records the Stripe event ID in `stripe_webhook_events` so retries are idempotent.
8. On `checkout.session.completed` with `payment_status=paid`, Laravel marks the order paid, commits ticket inventory, and creates tickets.
9. On failed or expired Checkout events, Laravel marks the order `failed` or `cancelled`.

## Test Mode

Use Stripe test keys only:

```env
STRIPE_SECRET=sk_test_...
```

Test card examples:
- Successful card: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Declined card: `4000 0000 0000 9995`

Use any future expiry date, any CVC, and any postal code.

## Webhook Lifecycle

The success redirect only tells the browser where to go after Checkout. It does not mark an order paid. The webhook is the source of truth because it is signed by Stripe and delivered server-to-server. If Stripe retries the same event, the unique `stripe_event_id` prevents duplicate fulfillment.
