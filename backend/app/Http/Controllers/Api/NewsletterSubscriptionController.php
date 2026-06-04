<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreNewsletterSubscriptionRequest;
use App\Models\NewsletterSubscription;
use Illuminate\Http\JsonResponse;

class NewsletterSubscriptionController extends Controller
{
    public function store(StoreNewsletterSubscriptionRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $email = mb_strtolower($validated['email']);

        $subscription = NewsletterSubscription::query()->updateOrCreate(
            ['email' => $email],
            [
                'source' => $validated['source'] ?? 'homepage',
                'subscribed_at' => now(),
                'ip_address' => $request->ip(),
                'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
            ],
        );

        return response()->json([
            'data' => [
                'id' => $subscription->id,
                'email' => $subscription->email,
                'subscribed_at' => $subscription->subscribed_at,
            ],
            'message' => 'Subscribed successfully.',
        ], $subscription->wasRecentlyCreated ? 201 : 200);
    }
}
