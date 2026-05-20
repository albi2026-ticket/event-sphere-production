<?php

namespace App\Http\Controllers\Api\Payments;

use App\Http\Controllers\Controller;
use App\Services\Payments\StripePaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Stripe\Exception\SignatureVerificationException;
use UnexpectedValueException;

class WebhookController extends Controller
{
    public function __construct(private readonly StripePaymentService $stripe) {}

    public function __invoke(Request $request): JsonResponse
    {
        try {
            $event = $this->stripe->constructWebhookEvent(
                $request->getContent(),
                $request->header('Stripe-Signature')
            );

            $processed = $this->stripe->handleWebhookEvent($event);
        } catch (UnexpectedValueException) {
            return response()->json(['message' => 'Invalid Stripe payload.'], 400);
        } catch (SignatureVerificationException) {
            return response()->json(['message' => 'Invalid Stripe signature.'], 400);
        }

        return response()->json([
            'received' => true,
            'processed' => $processed,
        ]);
    }
}
