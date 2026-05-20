# Event Sphere — Frontend API Integration

## Environment

**Backend** (`backend/.env`):

```env
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:5173
STRIPE_CHECKOUT_SUCCESS_URL="${FRONTEND_URL}/site/checkout-success.html?session_id={CHECKOUT_SESSION_ID}&order_id={ORDER_ID}"
STRIPE_CHECKOUT_CANCEL_URL="${FRONTEND_URL}/site/checkout-cancelled.html?order={ORDER_NUMBER}"
```

`FRONTEND_URL` must match the browser origin exactly (Vite dev server port or static host).

**Frontend** — override API base per deployment via `<meta name="api-base" content="http://127.0.0.1:8000/api">` on each page, or:

```html
<script>window.__EVENT_SPHERE_API__ = 'http://127.0.0.1:8000/api';</script>
```

## Local development

1. `cd backend && php artisan serve` (API at `http://127.0.0.1:8000`)
2. `npm run dev` (static pages at `http://localhost:5173/site/...`)
3. Stripe webhooks: `stripe listen --forward-to http://127.0.0.1:8000/api/stripe/webhook`

## CORS

Laravel [`backend/config/cors.php`](backend/config/cors.php) allows `FRONTEND_URL` with credentials. The static UI uses Bearer tokens in `sessionStorage` (not cookies).
