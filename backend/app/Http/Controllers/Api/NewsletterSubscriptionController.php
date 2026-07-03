<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreNewsletterSubscriptionRequest;
use App\Mail\SubscriberWelcomeMail;
use App\Models\AuditLog;
use App\Models\NewsletterSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Mail;

class NewsletterSubscriptionController extends Controller
{
    public function store(StoreNewsletterSubscriptionRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $email = mb_strtolower($validated['email']);
        $source = $this->source($validated['source'] ?? null);
        $language = $validated['language'] ?? $request->header('X-Tiketa-Language', 'en');
        $language = in_array($language, ['en', 'sq'], true) ? $language : 'en';

        $subscription = NewsletterSubscription::query()->updateOrCreate(
            ['email' => $email],
            [
                'source' => $source,
                'language' => $language,
                'status' => NewsletterSubscription::STATUS_ACTIVE,
                'subscribed_at' => now(),
                'unsubscribed_at' => null,
                'ip_address' => $request->ip(),
                'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
            ],
        );

        $subscription->refresh();

        Mail::to($subscription->email)->queue(new SubscriberWelcomeMail($subscription));

        AuditLog::record(null, $subscription->wasRecentlyCreated ? 'newsletter_subscription.created' : 'newsletter_subscription.updated', $subscription, [
            'email' => $subscription->email,
            'source' => $subscription->source,
            'language' => $subscription->language,
            'status' => $subscription->status,
        ], $request->ip());

        return response()->json([
            'data' => [
                'id' => $subscription->id,
                'email' => $subscription->email,
                'source' => $subscription->source,
                'language' => $subscription->language,
                'status' => $subscription->status,
                'subscribed_at' => $subscription->subscribed_at,
            ],
            'message' => 'Subscribed successfully.',
        ], $subscription->wasRecentlyCreated ? 201 : 200);
    }

    public function unsubscribe(Request $request, NewsletterSubscription $newsletterSubscription): Response
    {
        if ($newsletterSubscription->status !== NewsletterSubscription::STATUS_UNSUBSCRIBED) {
            $newsletterSubscription->update([
                'status' => NewsletterSubscription::STATUS_UNSUBSCRIBED,
                'unsubscribed_at' => now(),
            ]);

            AuditLog::record(null, 'newsletter_subscription.unsubscribed', $newsletterSubscription, [
                'email' => $newsletterSubscription->email,
                'source' => $newsletterSubscription->source,
            ], $request->ip());
        }

        return response(
            '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unsubscribed - Tiketa</title></head><body style="font-family:Arial,sans-serif;background:#f7f7fb;color:#111827;display:grid;min-height:100vh;place-items:center;margin:0"><main style="max-width:520px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:32px;text-align:center"><h1 style="margin-top:0">You are unsubscribed</h1><p>Your Tiketa subscription has been marked as unsubscribed. We kept the record so your preference is respected.</p></main></body></html>',
            200,
            ['Content-Type' => 'text/html; charset=UTF-8'],
        );
    }

    private function source(?string $source): string
    {
        return match ($source) {
            'restaurants' => NewsletterSubscription::SOURCE_RESTAURANTS,
            default => NewsletterSubscription::SOURCE_EVENTS,
        };
    }
}
