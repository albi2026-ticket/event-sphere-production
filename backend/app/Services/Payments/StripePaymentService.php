<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\StripeWebhookEvent;
use App\Models\Ticket;
use App\Models\TicketType;
use App\Services\Tickets\TicketInventoryService;
use App\Services\Tickets\TicketService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Stripe\Checkout\Session;
use Stripe\Event;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Refund;
use Stripe\StripeClient;
use Stripe\Webhook;
use UnexpectedValueException;

class StripePaymentService
{
    public function __construct(
        private readonly TicketInventoryService $inventory,
        private readonly TicketService $tickets,
    ) {}

    public function createCheckoutSession(Order $order): Session
    {
        $order->loadMissing(['items.event', 'items.ticketType', 'user']);

        $this->ensureOrderCanCheckout($order);

        $client = $this->client();
        $successUrl = (string) config('services.stripe.success_url');
        $cancelUrl = str_replace('{ORDER_NUMBER}', urlencode($order->order_number), (string) config('services.stripe.cancel_url'));

        $session = $client->checkout->sessions->create([
            'mode' => 'payment',
            'payment_method_types' => ['card'],
            'customer_email' => $order->billing_email,
            'client_reference_id' => (string) $order->id,
            'line_items' => [[
                'quantity' => 1,
                'price_data' => [
                    'currency' => strtolower($order->currency ?: config('services.stripe.currency', 'USD')),
                    'unit_amount' => $this->decimalToMinorUnits((string) $order->total, (string) $order->currency),
                    'product_data' => [
                        'name' => "Event Sphere order {$order->order_number}",
                        'description' => $this->checkoutDescription($order),
                    ],
                ],
            ]],
            'metadata' => [
                'order_id' => (string) $order->id,
                'order_number' => $order->order_number,
                'user_id' => (string) $order->user_id,
            ],
            'payment_intent_data' => [
                'metadata' => [
                    'order_id' => (string) $order->id,
                    'order_number' => $order->order_number,
                    'user_id' => (string) $order->user_id,
                ],
            ],
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
        ]);

        $order->forceFill([
            'status' => Order::STATUS_PENDING,
            'payment_status' => Order::PAYMENT_STATUS_PENDING,
            'payment_provider' => 'stripe',
            'payment_reference' => $session->id,
            'stripe_checkout_session_id' => $session->id,
            'stripe_payment_status' => $session->payment_status,
            'checkout_expires_at' => $session->expires_at ? now()->setTimestamp((int) $session->expires_at) : null,
        ])->save();

        return $session;
    }

    /**
     * @throws SignatureVerificationException
     * @throws UnexpectedValueException
     */
    public function constructWebhookEvent(string $payload, ?string $signature): Event
    {
        $secret = config('services.stripe.webhook_secret');

        if (! is_string($secret) || $secret === '') {
            throw new UnexpectedValueException('Stripe webhook secret is not configured.');
        }

        return Webhook::constructEvent($payload, $signature ?? '', $secret);
    }

    public function handleWebhookEvent(Event $event): bool
    {
        return DB::transaction(function () use ($event): bool {
            $webhookEvent = StripeWebhookEvent::query()->firstOrCreate(
                ['stripe_event_id' => $event->id],
                [
                    'type' => $event->type,
                    'payload' => $event->toArray(),
                ]
            );

            if ($webhookEvent->processed_at !== null) {
                return false;
            }

            match ($event->type) {
                'checkout.session.completed',
                'checkout.session.async_payment_succeeded' => $this->markCheckoutSessionPaid($event->data->object),
                'checkout.session.async_payment_failed' => $this->markCheckoutSessionFailed($event->data->object),
                'checkout.session.expired' => $this->markCheckoutSessionCancelled($event->data->object),
                'payment_intent.payment_failed' => $this->markPaymentIntentFailed($event->data->object),
                default => null,
            };

            $webhookEvent->forceFill([
                'processed_at' => now(),
                'payload' => $event->toArray(),
            ])->save();

            return true;
        });
    }

    public function refundOrder(Order $order, ?float $amount = null, ?string $reason = null): Refund
    {
        if ($order->payment_status !== Order::PAYMENT_STATUS_PAID || ! $order->stripe_payment_intent_id) {
            throw ValidationException::withMessages([
                'order' => 'Only paid Stripe orders can be refunded.',
            ]);
        }

        $params = [
            'payment_intent' => $order->stripe_payment_intent_id,
            'metadata' => [
                'order_id' => (string) $order->id,
                'order_number' => $order->order_number,
            ],
        ];

        if ($amount !== null) {
            $params['amount'] = $this->decimalToMinorUnits((string) $amount, (string) $order->currency);
        }

        if ($reason !== null) {
            $params['reason'] = $reason;
        }

        $refund = $this->client()->refunds->create($params);

        $order->forceFill([
            'status' => Order::STATUS_REFUNDED,
            'payment_status' => Order::PAYMENT_STATUS_REFUNDED,
            'stripe_refund_id' => $refund->id,
            'refunded_at' => now(),
        ])->save();

        $this->tickets->markOrderTickets($order, Ticket::STATUS_REFUNDED);

        return $refund;
    }

    protected function markCheckoutSessionPaid(mixed $session): void
    {
        $order = $this->findOrderForSession($session);

        if (! $order || $order->payment_status === Order::PAYMENT_STATUS_PAID) {
            return;
        }

        $expectedAmount = $this->decimalToMinorUnits((string) $order->total, (string) $order->currency);
        $actualAmount = (int) ($session->amount_total ?? 0);
        $actualCurrency = strtoupper((string) ($session->currency ?? $order->currency));

        if ($expectedAmount !== $actualAmount || strtoupper($order->currency) !== $actualCurrency) {
            throw ValidationException::withMessages([
                'stripe' => 'Stripe checkout amount does not match the order total.',
            ]);
        }

        if (($session->payment_status ?? null) !== 'paid') {
            return;
        }

        $locked = Order::query()
            ->with(['items.ticketType'])
            ->whereKey($order->id)
            ->lockForUpdate()
            ->firstOrFail();

        if ($locked->payment_status === Order::PAYMENT_STATUS_PAID) {
            return;
        }

        foreach ($locked->items as $item) {
            $this->inventory->commitSale($item->ticketType, $item->quantity);
        }

        $this->tickets->generateForPaidOrder($locked);

        $locked->forceFill([
            'status' => Order::STATUS_PAID,
            'payment_status' => Order::PAYMENT_STATUS_PAID,
            'payment_provider' => 'stripe',
            'payment_reference' => $session->id,
            'stripe_checkout_session_id' => $session->id,
            'stripe_payment_intent_id' => is_string($session->payment_intent ?? null) ? $session->payment_intent : null,
            'stripe_payment_status' => $session->payment_status,
            'paid_at' => now(),
        ])->save();
    }

    protected function markCheckoutSessionFailed(mixed $session): void
    {
        $this->markOrderPaymentStatus($this->findOrderForSession($session), Order::PAYMENT_STATUS_FAILED, [
            'stripe_payment_status' => $session->payment_status ?? 'failed',
        ]);
    }

    protected function markCheckoutSessionCancelled(mixed $session): void
    {
        $this->markOrderPaymentStatus($this->findOrderForSession($session), Order::PAYMENT_STATUS_CANCELLED, [
            'status' => Order::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'stripe_payment_status' => $session->payment_status ?? 'expired',
        ]);
    }

    protected function markPaymentIntentFailed(mixed $paymentIntent): void
    {
        $order = Order::query()
            ->where('stripe_payment_intent_id', $paymentIntent->id)
            ->orWhere('id', $paymentIntent->metadata->order_id ?? null)
            ->first();

        $this->markOrderPaymentStatus($order, Order::PAYMENT_STATUS_FAILED, [
            'stripe_payment_intent_id' => $paymentIntent->id,
            'stripe_payment_status' => $paymentIntent->status ?? 'failed',
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function markOrderPaymentStatus(?Order $order, string $paymentStatus, array $attributes = []): void
    {
        if (! $order || $order->payment_status === Order::PAYMENT_STATUS_PAID) {
            return;
        }

        $order->forceFill(array_merge([
            'payment_status' => $paymentStatus,
        ], $attributes))->save();
    }

    protected function findOrderForSession(mixed $session): ?Order
    {
        return Order::query()
            ->where('stripe_checkout_session_id', $session->id)
            ->orWhere('payment_reference', $session->id)
            ->orWhere('id', $session->metadata->order_id ?? null)
            ->first();
    }

    protected function ensureOrderCanCheckout(Order $order): void
    {
        if ($order->items->isEmpty()) {
            throw ValidationException::withMessages([
                'order' => 'Order must contain at least one item before checkout.',
            ]);
        }

        if ($order->payment_status === Order::PAYMENT_STATUS_PAID) {
            throw ValidationException::withMessages([
                'order' => 'This order has already been paid.',
            ]);
        }

        if ((float) $order->total <= 0) {
            throw ValidationException::withMessages([
                'total' => 'Order total must be greater than zero.',
            ]);
        }

        foreach ($order->items as $item) {
            if (! $item->ticketType instanceof TicketType || ! $item->ticketType->isAvailableForPurchase($item->quantity)) {
                throw ValidationException::withMessages([
                    'items' => "Ticket inventory is no longer available for {$item->ticket_type_name}.",
                ]);
            }
        }
    }

    protected function checkoutDescription(Order $order): string
    {
        return $order->items
            ->map(fn ($item): string => "{$item->quantity} x {$item->ticket_type_name}")
            ->implode(', ');
    }

    protected function decimalToMinorUnits(string $amount, string $currency): int
    {
        $currency = strtoupper($currency);

        if (in_array($currency, ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'], true)) {
            return (int) round((float) $amount);
        }

        return (int) round(((float) $amount) * 100);
    }

    protected function client(): StripeClient
    {
        $secret = config('services.stripe.secret');

        if (! is_string($secret) || $secret === '') {
            throw ValidationException::withMessages([
                'stripe' => 'Stripe secret key is not configured.',
            ]);
        }

        return new StripeClient($secret);
    }
}
